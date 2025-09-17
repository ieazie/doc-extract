"""
Job Monitoring Service for Phase 10.6: Enhanced Job Execution Monitoring and History
Provides comprehensive tracking, statistics, and monitoring for extraction jobs
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc

from ..models.database import (
    ExtractionJob, 
    DocumentExtractionTracking, 
    Document, 
    Extraction,
    DocumentCategory,
    Template
)


class JobMonitoringService:
    """Service for comprehensive job monitoring, statistics, and history tracking"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_job_statistics(self, job_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get comprehensive statistics for a job over a specified time period
        
        Args:
            job_id: Job UUID string
            days: Number of days to look back for statistics
            
        Returns:
            Dict with comprehensive job statistics
        """
        try:
            job = self.db.query(ExtractionJob).filter(ExtractionJob.id == job_id).first()
            if not job:
                return {"error": "Job not found"}
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get execution statistics - simplified approach
            total_executions = self.db.query(
                func.count(DocumentExtractionTracking.id)
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.queued_at >= start_date
            ).scalar() or 0
            
            successful_executions = self.db.query(
                func.count(DocumentExtractionTracking.id)
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.status == 'completed',
                DocumentExtractionTracking.queued_at >= start_date
            ).scalar() or 0
            
            failed_executions = self.db.query(
                func.count(DocumentExtractionTracking.id)
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.status == 'failed',
                DocumentExtractionTracking.queued_at >= start_date
            ).scalar() or 0
            
            skipped_executions = self.db.query(
                func.count(DocumentExtractionTracking.id)
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.status == 'skipped',
                DocumentExtractionTracking.queued_at >= start_date
            ).scalar() or 0
            
            avg_processing_time = self.db.query(
                func.avg(DocumentExtractionTracking.processing_time_ms)
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.status == 'completed',
                DocumentExtractionTracking.queued_at >= start_date
            ).scalar() or 0
            
            last_execution = self.db.query(
                func.max(DocumentExtractionTracking.completed_at)
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.queued_at >= start_date
            ).scalar()
            
            # Get daily execution trends - simplified
            daily_stats = []
            for i in range(min(30, days)):
                date = (end_date - timedelta(days=i)).date()
                
                day_total = self.db.query(
                    func.count(DocumentExtractionTracking.id)
                ).filter(
                    DocumentExtractionTracking.job_id == job_id,
                    func.date(DocumentExtractionTracking.queued_at) == date
                ).scalar() or 0
                
                day_successful = self.db.query(
                    func.count(DocumentExtractionTracking.id)
                ).filter(
                    DocumentExtractionTracking.job_id == job_id,
                    DocumentExtractionTracking.status == 'completed',
                    func.date(DocumentExtractionTracking.queued_at) == date
                ).scalar() or 0
                
                day_failed = self.db.query(
                    func.count(DocumentExtractionTracking.id)
                ).filter(
                    DocumentExtractionTracking.job_id == job_id,
                    DocumentExtractionTracking.status == 'failed',
                    func.date(DocumentExtractionTracking.queued_at) == date
                ).scalar() or 0
                
                day_avg_time = self.db.query(
                    func.avg(DocumentExtractionTracking.processing_time_ms)
                ).filter(
                    DocumentExtractionTracking.job_id == job_id,
                    DocumentExtractionTracking.status == 'completed',
                    func.date(DocumentExtractionTracking.queued_at) == date
                ).scalar() or 0
                
                if day_total > 0:  # Only include days with executions
                    daily_stats.append({
                        "date": date.isoformat(),
                        "total_executions": day_total,
                        "successful": day_successful,
                        "failed": day_failed,
                        "success_rate": round((day_successful / day_total * 100) if day_total > 0 else 0, 2),
                        "avg_processing_time_ms": int(day_avg_time or 0)
                    })
            
            # Get error analysis
            error_stats = self.db.query(
                DocumentExtractionTracking.error_message,
                func.count(DocumentExtractionTracking.id).label('count')
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.status == 'failed',
                DocumentExtractionTracking.error_message.isnot(None),
                DocumentExtractionTracking.queued_at >= start_date
            ).group_by(
                DocumentExtractionTracking.error_message
            ).order_by(desc('count')).limit(10).all()
            
            # Get performance metrics
            performance_stats = self.db.query(
                func.percentile_cont(0.5).within_group(DocumentExtractionTracking.processing_time_ms).label('median_time'),
                func.percentile_cont(0.95).within_group(DocumentExtractionTracking.processing_time_ms).label('p95_time'),
                func.percentile_cont(0.99).within_group(DocumentExtractionTracking.processing_time_ms).label('p99_time')
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.status == 'completed',
                DocumentExtractionTracking.processing_time_ms.isnot(None),
                DocumentExtractionTracking.queued_at >= start_date
            ).first()
            
            # Calculate success rate
            success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
            
            # Calculate uptime (jobs that completed within expected time)
            expected_time = 300000  # 5 minutes in milliseconds
            on_time_executions = self.db.query(
                func.count(DocumentExtractionTracking.id)
            ).filter(
                DocumentExtractionTracking.job_id == job_id,
                DocumentExtractionTracking.status == 'completed',
                DocumentExtractionTracking.processing_time_ms <= expected_time,
                DocumentExtractionTracking.queued_at >= start_date
            ).scalar() or 0
            
            uptime_rate = (on_time_executions / total_executions * 100) if total_executions > 0 else 0
            
            return {
                "job_id": job_id,
                "job_name": job.name,
                "period_days": days,
                "statistics": {
                    "total_executions": total_executions,
                    "successful_executions": successful_executions,
                    "failed_executions": failed_executions,
                    "skipped_executions": skipped_executions,
                    "success_rate": round(success_rate, 2),
                    "uptime_rate": round(uptime_rate, 2),
                    "avg_processing_time_ms": int(avg_processing_time or 0),
                    "median_processing_time_ms": int(performance_stats.median_time or 0),
                    "p95_processing_time_ms": int(performance_stats.p95_time or 0),
                    "p99_processing_time_ms": int(performance_stats.p99_time or 0),
                    "last_execution": last_execution.isoformat() if last_execution else None
                },
                "daily_trends": daily_stats,
                "error_analysis": [
                    {
                        "error_message": error.error_message,
                        "count": error.count,
                        "percentage": round((error.count / total_executions * 100) if total_executions > 0 else 0, 2)
                    }
                    for error in error_stats
                ],
                "performance_metrics": {
                    "median_time_ms": int(performance_stats.median_time or 0),
                    "p95_time_ms": int(performance_stats.p95_time or 0),
                    "p99_time_ms": int(performance_stats.p99_time or 0),
                    "avg_time_ms": int(avg_processing_time or 0)
                }
            }
            
        except Exception as e:
            return {"error": f"Failed to get job statistics: {str(e)}"}
    
    def get_tenant_job_overview(self, tenant_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Get overview of all jobs for a tenant
        
        Args:
            tenant_id: Tenant UUID string
            days: Number of days to look back
            
        Returns:
            Dict with tenant job overview
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get job summary statistics
            job_stats = self.db.query(
                func.count(ExtractionJob.id).label('total_jobs'),
                func.sum(
                    func.case(
                        (ExtractionJob.is_active == True, 1),
                        else_=0
                    )
                ).label('active_jobs'),
                func.sum(
                    func.case(
                        (ExtractionJob.schedule_type == 'recurring', 1),
                        else_=0
                    )
                ).label('recurring_jobs'),
                func.sum(
                    func.case(
                        (ExtractionJob.schedule_type == 'scheduled', 1),
                        else_=0
                    )
                ).label('scheduled_jobs'),
                func.sum(ExtractionJob.total_executions).label('total_executions'),
                func.sum(ExtractionJob.successful_executions).label('total_successful'),
                func.sum(ExtractionJob.failed_executions).label('total_failed')
            ).filter(ExtractionJob.tenant_id == tenant_id).first()
            
            # Get recent execution trends
            recent_executions = self.db.query(
                func.date(DocumentExtractionTracking.queued_at).label('date'),
                func.count(DocumentExtractionTracking.id).label('count'),
                func.sum(
                    func.case(
                        (DocumentExtractionTracking.status == 'completed', 1),
                        else_=0
                    )
                ).label('successful'),
                func.sum(
                    func.case(
                        (DocumentExtractionTracking.status == 'failed', 1),
                        else_=0
                    )
                ).label('failed')
            ).join(
                ExtractionJob, DocumentExtractionTracking.job_id == ExtractionJob.id
            ).filter(
                ExtractionJob.tenant_id == tenant_id,
                DocumentExtractionTracking.queued_at >= start_date
            ).group_by(
                func.date(DocumentExtractionTracking.queued_at)
            ).order_by(desc('date')).limit(days).all()
            
            # Get top performing jobs
            top_jobs = self.db.query(
                ExtractionJob.id,
                ExtractionJob.name,
                ExtractionJob.total_executions,
                ExtractionJob.successful_executions,
                ExtractionJob.failed_executions
            ).filter(
                ExtractionJob.tenant_id == tenant_id,
                ExtractionJob.total_executions > 0
            ).order_by(
                desc(ExtractionJob.total_executions)
            ).limit(5).all()
            
            # Calculate overall success rate
            total_executions = job_stats.total_executions or 0
            total_successful = job_stats.total_successful or 0
            overall_success_rate = (total_successful / total_executions * 100) if total_executions > 0 else 0
            
            return {
                "tenant_id": tenant_id,
                "period_days": days,
                "summary": {
                    "total_jobs": job_stats.total_jobs or 0,
                    "active_jobs": job_stats.active_jobs or 0,
                    "recurring_jobs": job_stats.recurring_jobs or 0,
                    "scheduled_jobs": job_stats.scheduled_jobs or 0,
                    "total_executions": total_executions,
                    "total_successful": total_successful,
                    "total_failed": job_stats.total_failed or 0,
                    "overall_success_rate": round(overall_success_rate, 2)
                },
                "recent_trends": [
                    {
                        "date": exec_stat.date.isoformat(),
                        "total_executions": exec_stat.count,
                        "successful": exec_stat.successful,
                        "failed": exec_stat.failed,
                        "success_rate": round((exec_stat.successful / exec_stat.count * 100) if exec_stat.count > 0 else 0, 2)
                    }
                    for exec_stat in recent_executions
                ],
                "top_jobs": [
                    {
                        "job_id": str(job.id),
                        "job_name": job.name,
                        "total_executions": job.total_executions,
                        "successful_executions": job.successful_executions,
                        "failed_executions": job.failed_executions,
                        "success_rate": round((job.successful_executions / job.total_executions * 100) if job.total_executions > 0 else 0, 2)
                    }
                    for job in top_jobs
                ]
            }
            
        except Exception as e:
            return {"error": f"Failed to get tenant job overview: {str(e)}"}
    
    def get_execution_history(
        self, 
        job_id: str, 
        limit: int = 50, 
        offset: int = 0,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get detailed execution history for a job
        
        Args:
            job_id: Job UUID string
            limit: Number of records to return
            offset: Number of records to skip
            status_filter: Optional status filter ('pending', 'completed', 'failed', etc.)
            
        Returns:
            Dict with execution history
        """
        try:
            query = self.db.query(DocumentExtractionTracking).filter(
                DocumentExtractionTracking.job_id == job_id
            )
            
            if status_filter:
                query = query.filter(DocumentExtractionTracking.status == status_filter)
            
            total_count = query.count()
            
            executions = query.order_by(
                desc(DocumentExtractionTracking.queued_at)
            ).offset(offset).limit(limit).all()
            
            return {
                "job_id": job_id,
                "total_count": total_count,
                "returned_count": len(executions),
                "offset": offset,
                "limit": limit,
                "executions": [
                    {
                        "id": str(execution.id),
                        "document_id": str(execution.document_id),
                        "status": execution.status,
                        "triggered_by": execution.triggered_by,
                        "queued_at": execution.queued_at.isoformat(),
                        "started_at": execution.started_at.isoformat() if execution.started_at else None,
                        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
                        "processing_time_ms": execution.processing_time_ms,
                        "retry_count": execution.retry_count,
                        "error_message": execution.error_message
                    }
                    for execution in executions
                ]
            }
            
        except Exception as e:
            return {"error": f"Failed to get execution history: {str(e)}"}
    
    def get_performance_alerts(self, tenant_id: str, threshold_minutes: int = 10) -> List[Dict[str, Any]]:
        """
        Get performance alerts for jobs that are performing poorly
        
        Args:
            tenant_id: Tenant UUID string
            threshold_minutes: Alert threshold in minutes for processing time
            
        Returns:
            List of performance alerts
        """
        try:
            threshold_ms = threshold_minutes * 60 * 1000
            recent_date = datetime.now() - timedelta(hours=24)
            
            # Get jobs with poor performance
            poor_performance = self.db.query(
                ExtractionJob.id,
                ExtractionJob.name,
                func.avg(DocumentExtractionTracking.processing_time_ms).label('avg_time'),
                func.count(DocumentExtractionTracking.id).label('recent_executions')
            ).join(
                DocumentExtractionTracking, ExtractionJob.id == DocumentExtractionTracking.job_id
            ).filter(
                ExtractionJob.tenant_id == tenant_id,
                ExtractionJob.is_active == True,
                DocumentExtractionTracking.status == 'completed',
                DocumentExtractionTracking.queued_at >= recent_date,
                DocumentExtractionTracking.processing_time_ms > threshold_ms
            ).group_by(
                ExtractionJob.id, ExtractionJob.name
            ).having(
                func.count(DocumentExtractionTracking.id) >= 3  # At least 3 recent executions
            ).all()
            
            # Get jobs with high failure rates
            high_failure_rate = self.db.query(
                ExtractionJob.id,
                ExtractionJob.name,
                func.count(DocumentExtractionTracking.id).label('total_executions'),
                func.sum(
                    func.case(
                        (DocumentExtractionTracking.status == 'failed', 1),
                        else_=0
                    )
                ).label('failed_executions')
            ).join(
                DocumentExtractionTracking, ExtractionJob.id == DocumentExtractionTracking.job_id
            ).filter(
                ExtractionJob.tenant_id == tenant_id,
                ExtractionJob.is_active == True,
                DocumentExtractionTracking.queued_at >= recent_date
            ).group_by(
                ExtractionJob.id, ExtractionJob.name
            ).having(
                func.count(DocumentExtractionTracking.id) >= 5,  # At least 5 recent executions
                func.sum(
                    func.case(
                        (DocumentExtractionTracking.status == 'failed', 1),
                        else_=0
                    )
                ) >= 3  # At least 3 failures
            ).all()
            
            alerts = []
            
            # Add performance alerts
            for job in poor_performance:
                failure_rate = (job.recent_executions - 1) / job.recent_executions * 100  # Rough calculation
                alerts.append({
                    "type": "performance",
                    "severity": "warning",
                    "job_id": str(job.id),
                    "job_name": job.name,
                    "message": f"Job processing time is {int(job.avg_time / 1000 / 60)} minutes on average (threshold: {threshold_minutes} minutes)",
                    "avg_processing_time_ms": int(job.avg_time),
                    "recent_executions": job.recent_executions,
                    "threshold_minutes": threshold_minutes
                })
            
            # Add failure rate alerts
            for job in high_failure_rate:
                failure_rate = (job.failed_executions / job.total_executions) * 100
                alerts.append({
                    "type": "reliability",
                    "severity": "error" if failure_rate > 50 else "warning",
                    "job_id": str(job.id),
                    "job_name": job.name,
                    "message": f"Job has {failure_rate:.1f}% failure rate in recent executions",
                    "failure_rate": round(failure_rate, 2),
                    "failed_executions": job.failed_executions,
                    "total_executions": job.total_executions
                })
            
            return alerts
            
        except Exception as e:
            return [{"error": f"Failed to get performance alerts: {str(e)}"}]


def create_job_monitoring_service(db: Session) -> JobMonitoringService:
    """Factory function to create a JobMonitoringService instance"""
    return JobMonitoringService(db)
