"""
Scheduling Service for Phase 10.6: Scheduling & Recurring Jobs
Handles cron expression parsing, timezone conversion, and schedule conflict detection
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.database import ExtractionJob
from ..config import settings

# Import with error handling for optional dependencies
try:
    import pytz
except ImportError:
    pytz = None

try:
    from croniter import croniter, CroniterBadCronError
except ImportError:
    croniter = None
    CroniterBadCronError = Exception


class SchedulingService:
    """Service for handling job scheduling, cron parsing, and conflict detection"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_cron_expression(self, cron_expr: str) -> Dict[str, Any]:
        """
        Validate a cron expression and return validation results
        
        Args:
            cron_expr: Cron expression string (e.g., "0 9 * * 1-5")
            
        Returns:
            Dict with validation results and parsed information
        """
        if croniter is None:
            return {
                "valid": False,
                "error": "croniter library not available",
                "cron_expression": cron_expr,
                "suggestion": "Install croniter library for cron validation"
            }
        
        try:
            # Test if cron expression is valid
            cron = croniter(cron_expr)
            
            # Get next few run times to validate
            next_runs = []
            if pytz:
                current_time = datetime.now(pytz.UTC)
            else:
                current_time = datetime.now()
            
            for i in range(5):  # Get next 5 runs
                next_run = cron.get_next(datetime)
                next_runs.append(next_run.isoformat())
                current_time = next_run
            
            return {
                "valid": True,
                "cron_expression": cron_expr,
                "next_runs": next_runs,
                "description": self._describe_cron_pattern(cron_expr),
                "timezone_aware": False  # Will be set by timezone handling
            }
            
        except CroniterBadCronError as e:
            return {
                "valid": False,
                "error": str(e),
                "cron_expression": cron_expr,
                "suggestion": self._suggest_cron_fix(cron_expr)
            }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Unexpected error: {str(e)}",
                "cron_expression": cron_expr
            }
    
    def _describe_cron_pattern(self, cron_expr: str) -> str:
        """Generate human-readable description of cron pattern"""
        parts = cron_expr.split()
        if len(parts) != 5:
            return "Invalid format"
        
        minute, hour, day, month, weekday = parts
        
        descriptions = []
        
        # Minute
        if minute == "*":
            descriptions.append("every minute")
        elif minute.isdigit():
            descriptions.append(f"at minute {minute}")
        elif "," in minute:
            descriptions.append(f"at minutes {minute}")
        
        # Hour
        if hour == "*":
            if minute == "*":
                descriptions = ["every hour"]
        elif hour.isdigit():
            descriptions.append(f"at hour {hour}")
        elif "," in hour:
            descriptions.append(f"at hours {hour}")
        
        # Day of month
        if day != "*":
            if day.isdigit():
                descriptions.append(f"on day {day}")
            elif "," in day:
                descriptions.append(f"on days {day}")
        
        # Month
        if month != "*":
            if month.isdigit():
                descriptions.append(f"in month {month}")
            elif "," in month:
                descriptions.append(f"in months {month}")
        
        # Weekday
        if weekday != "*":
            weekday_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            if weekday.isdigit():
                day_num = int(weekday)
                if 0 <= day_num <= 6:
                    descriptions.append(f"on {weekday_names[day_num]}")
            elif "," in weekday:
                day_nums = [int(d) for d in weekday.split(",") if d.isdigit()]
                day_names = [weekday_names[d] for d in day_nums if 0 <= d <= 6]
                descriptions.append(f"on {', '.join(day_names)}")
        
        return " ".join(descriptions) if descriptions else "complex pattern"
    
    def _suggest_cron_fix(self, cron_expr: str) -> str:
        """Suggest fixes for common cron expression errors"""
        parts = cron_expr.split()
        
        if len(parts) != 5:
            return "Cron expression must have exactly 5 parts: minute hour day month weekday"
        
        suggestions = []
        
        # Check each part
        for i, part in enumerate(parts):
            if not self._is_valid_cron_part(part, i):
                field_names = ["minute", "hour", "day", "month", "weekday"]
                suggestions.append(f"Invalid {field_names[i]}: '{part}'")
        
        if suggestions:
            return f"Fix these issues: {'; '.join(suggestions)}"
        
        return "Check cron expression syntax"
    
    def _is_valid_cron_part(self, part: str, field_index: int) -> bool:
        """Check if a cron part is valid for its field"""
        if part == "*":
            return True
        
        # Check ranges and lists
        if "," in part:
            return all(self._is_valid_cron_part(p.strip(), field_index) for p in part.split(","))
        
        if "-" in part:
            try:
                start, end = part.split("-", 1)
                return self._is_valid_cron_part(start, field_index) and self._is_valid_cron_part(end, field_index)
            except ValueError:
                return False
        
        if "/" in part:
            try:
                base, step = part.split("/", 1)
                return self._is_valid_cron_part(base, field_index) and step.isdigit()
            except ValueError:
                return False
        
        # Check if it's a valid number for the field
        try:
            value = int(part)
            max_values = [59, 23, 31, 12, 6]  # minute, hour, day, month, weekday
            return 0 <= value <= max_values[field_index]
        except ValueError:
            return False
    
    def calculate_next_run_time(
        self, 
        cron_expr: str, 
        timezone_str: str = "UTC",
        current_time: Optional[datetime] = None
    ) -> Optional[datetime]:
        """
        Calculate the next run time for a cron expression with timezone support
        
        Args:
            cron_expr: Cron expression string
            timezone_str: Timezone string (e.g., "America/New_York")
            current_time: Current time (defaults to now)
            
        Returns:
            Next run time as datetime object or None if invalid
        """
        if croniter is None:
            return None
            
        try:
            # Get timezone object
            if pytz:
                tz = pytz.timezone(timezone_str)
            else:
                # Fallback if pytz not available
                tz = None
            
            # Use current time in the specified timezone
            if current_time is None:
                if tz:
                    current_time = datetime.now(tz)
                else:
                    current_time = datetime.now()
            elif current_time.tzinfo is None and tz:
                current_time = tz.localize(current_time)
            elif current_time.tzinfo is not None and tz:
                # Convert to target timezone
                current_time = current_time.astimezone(tz)
            
            # Create croniter with timezone-aware datetime
            cron = croniter(cron_expr, current_time)
            
            # Get next run time
            next_run = cron.get_next(datetime)
            
            # Ensure it's timezone-aware
            if next_run.tzinfo is None and tz:
                next_run = tz.localize(next_run)
            
            return next_run
            
        except Exception as e:
            print(f"Error calculating next run time: {e}")
            return None
    
    def detect_schedule_conflicts(
        self, 
        tenant_id: str,
        new_job_schedule: Dict[str, Any],
        exclude_job_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect potential schedule conflicts for a new job
        
        Args:
            tenant_id: Tenant ID to check conflicts within
            new_job_schedule: New job schedule configuration
            exclude_job_id: Job ID to exclude from conflict check (for updates)
            
        Returns:
            List of potential conflicts
        """
        conflicts = []
        
        # Get existing active jobs for the tenant
        query = self.db.query(ExtractionJob).filter(
            ExtractionJob.tenant_id == tenant_id,
            ExtractionJob.is_active == True,
            ExtractionJob.schedule_type == 'recurring'
        )
        
        if exclude_job_id:
            query = query.filter(ExtractionJob.id != exclude_job_id)
        
        existing_jobs = query.all()
        
        # Check for conflicts with each existing job
        for job in existing_jobs:
            conflict = self._check_job_conflict(new_job_schedule, job)
            if conflict:
                conflicts.append(conflict)
        
        return conflicts
    
    def _check_job_conflict(
        self, 
        new_schedule: Dict[str, Any], 
        existing_job: ExtractionJob
    ) -> Optional[Dict[str, Any]]:
        """Check if two job schedules conflict"""
        
        # Both must be recurring jobs to have conflicts
        if new_schedule.get('schedule_type') != 'recurring' or existing_job.schedule_type != 'recurring':
            return None
        
        new_cron = new_schedule.get('schedule_config', {}).get('cron')
        existing_cron = existing_job.schedule_config.get('cron') if existing_job.schedule_config else None
        
        if not new_cron or not existing_cron:
            return None
        
        # Check if cron expressions are identical (exact conflict)
        if new_cron == existing_cron:
            return {
                "type": "exact_match",
                "severity": "high",
                "existing_job": {
                    "id": str(existing_job.id),
                    "name": existing_job.name,
                    "cron": existing_cron
                },
                "new_job_cron": new_cron,
                "description": "Identical cron expressions will cause exact scheduling conflicts"
            }
        
        # Check for overlapping execution times in the next 24 hours
        overlap_conflict = self._check_time_overlap(new_cron, existing_cron)
        if overlap_conflict:
            return {
                "type": "time_overlap",
                "severity": "medium",
                "existing_job": {
                    "id": str(existing_job.id),
                    "name": existing_job.name,
                    "cron": existing_cron
                },
                "new_job_cron": new_cron,
                "description": f"Potential time overlap: {overlap_conflict['description']}",
                "overlap_details": overlap_conflict
            }
        
        return None
    
    def _check_time_overlap(self, cron1: str, cron2: str) -> Optional[Dict[str, Any]]:
        """Check if two cron expressions have overlapping execution times"""
        try:
            # Get next 10 run times for each cron expression
            now = datetime.now(pytz.UTC)
            
            cron1_iter = croniter(cron1, now)
            cron2_iter = croniter(cron2, now)
            
            cron1_times = []
            cron2_times = []
            
            for _ in range(10):
                cron1_times.append(cron1_iter.get_next(datetime))
                cron2_times.append(cron2_iter.get_next(datetime))
            
            # Check for overlaps (within 5 minutes)
            for t1 in cron1_times:
                for t2 in cron2_times:
                    time_diff = abs((t1 - t2).total_seconds())
                    if time_diff < 300:  # 5 minutes
                        return {
                            "description": f"Execution times within 5 minutes: {t1.strftime('%H:%M')} vs {t2.strftime('%H:%M')}",
                            "time1": t1.isoformat(),
                            "time2": t2.isoformat(),
                            "difference_seconds": time_diff
                        }
            
            return None
            
        except Exception:
            return None
    
    def get_schedule_recommendations(
        self, 
        tenant_id: str,
        job_category: str = None
    ) -> Dict[str, Any]:
        """
        Get schedule recommendations to avoid conflicts
        
        Args:
            tenant_id: Tenant ID
            job_category: Optional category to focus recommendations on
            
        Returns:
            Dict with schedule recommendations
        """
        # Get existing job schedules
        query = self.db.query(ExtractionJob).filter(
            ExtractionJob.tenant_id == tenant_id,
            ExtractionJob.is_active == True,
            ExtractionJob.schedule_type == 'recurring'
        )
        
        if job_category:
            # Assuming we have category filtering - adjust as needed
            pass
        
        existing_jobs = query.all()
        
        # Analyze existing schedules
        busy_hours = set()
        common_patterns = {}
        
        for job in existing_jobs:
            if job.schedule_config and job.schedule_config.get('cron'):
                cron = job.schedule_config['cron']
                try:
                    # Get next few run times to analyze patterns
                    now = datetime.now(pytz.UTC)
                    cron_iter = croniter(cron, now)
                    
                    for _ in range(5):
                        next_run = cron_iter.get_next(datetime)
                        busy_hours.add(next_run.hour)
                        
                    # Track common patterns
                    pattern = self._simplify_cron_pattern(cron)
                    common_patterns[pattern] = common_patterns.get(pattern, 0) + 1
                        
                except Exception:
                    continue
        
        # Generate recommendations
        recommendations = {
            "avoid_hours": sorted(list(busy_hours)),
            "common_patterns": common_patterns,
            "suggested_schedules": self._generate_schedule_suggestions(busy_hours, common_patterns)
        }
        
        return recommendations
    
    def _simplify_cron_pattern(self, cron: str) -> str:
        """Simplify cron pattern for analysis"""
        parts = cron.split()
        if len(parts) != 5:
            return "invalid"
        
        minute, hour, day, month, weekday = parts
        
        # Simplify to basic patterns
        if minute == "0" and day == "*" and month == "*" and weekday == "*":
            return f"hourly_at_{hour}"
        elif minute == "0" and day == "*" and month == "*":
            return f"daily_at_{hour}_weekday_{weekday}"
        elif minute == "0" and weekday == "*":
            return f"monthly_day_{day}_hour_{hour}"
        else:
            return "custom"
    
    def _generate_schedule_suggestions(
        self, 
        busy_hours: set, 
        common_patterns: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """Generate schedule suggestions to avoid conflicts"""
        suggestions = []
        
        # Find available hours (0-23 not in busy_hours)
        available_hours = [h for h in range(24) if h not in busy_hours]
        
        if available_hours:
            # Suggest hourly schedules
            for hour in available_hours[:3]:  # Top 3 available hours
                suggestions.append({
                    "type": "daily",
                    "cron": f"0 {hour} * * *",
                    "description": f"Daily at {hour:02d}:00",
                    "reason": "Low conflict risk"
                })
        
        # Suggest off-peak times
        off_peak_hours = [1, 2, 3, 4, 5, 22, 23]  # Late night/early morning
        for hour in off_peak_hours:
            if hour not in busy_hours:
                suggestions.append({
                    "type": "daily",
                    "cron": f"0 {hour} * * *",
                    "description": f"Daily at {hour:02d}:00 (off-peak)",
                    "reason": "Off-peak time, minimal impact"
                })
                break
        
        # Suggest weekly schedules if daily is crowded
        if len(busy_hours) > 12:  # More than half the day is busy
            weekday_hours = [h for h in range(9, 17) if h not in busy_hours]
            if weekday_hours:
                hour = weekday_hours[0]
                suggestions.append({
                    "type": "weekly",
                    "cron": f"0 {hour} * * 1",  # Monday
                    "description": f"Weekly on Monday at {hour:02d}:00",
                    "reason": "Weekly schedule to avoid daily conflicts"
                })
        
        return suggestions


def create_scheduling_service(db: Session) -> SchedulingService:
    """Factory function to create a SchedulingService instance"""
    return SchedulingService(db)
