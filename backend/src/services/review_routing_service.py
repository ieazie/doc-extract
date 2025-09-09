"""
Review Routing Service
Handles automatic routing of extractions to review based on confidence scores
"""
import logging
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..models.database import Extraction, Template
from ..core.document_processor import detectLowConfidenceFields

logger = logging.getLogger(__name__)

class ReviewRoutingService:
    """Service for automatic review routing based on confidence scores"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def should_route_to_review(self, extraction: Extraction, template: Template) -> Tuple[bool, str, List[str]]:
        """
        Determine if an extraction should be routed to review
        
        Returns:
            Tuple of (should_route, reason, flagged_fields)
        """
        if not extraction.results or not extraction.confidence_scores:
            return False, "No results or confidence scores available", []
        
        # Get confidence threshold from template
        confidence_threshold = self._get_confidence_threshold(template)
        
        # Detect low-confidence fields
        detection = detectLowConfidenceFields(
            extraction.results,
            extraction.confidence_scores,
            confidence_threshold
        )
        
        # Route to review if there are flagged fields
        if detection.flagged_count > 0:
            reason = f"{detection.flagged_count} field(s) below confidence threshold ({confidence_threshold:.1%})"
            flagged_field_names = [field.name for field in detection.flagged_fields]
            return True, reason, flagged_field_names
        
        # Route to review if overall confidence is very low
        overall_confidence = extraction.confidence_scores.get('overall', 0)
        if overall_confidence < 0.5:  # 50% threshold for overall confidence
            return True, f"Overall confidence too low ({overall_confidence:.1%})", []
        
        return False, "Confidence scores acceptable", []
    
    def auto_route_extraction(self, extraction_id: str) -> Dict[str, any]:
        """
        Automatically route an extraction to review if confidence criteria are met
        
        Returns:
            Dict with routing decision and details
        """
        try:
            # Get extraction with template
            extraction = self.db.query(Extraction).filter(Extraction.id == extraction_id).first()
            if not extraction:
                return {
                    "routed": False,
                    "reason": "Extraction not found",
                    "flagged_fields": []
                }
            
            template = self.db.query(Template).filter(Template.id == extraction.template_id).first()
            if not template:
                return {
                    "routed": False,
                    "reason": "Template not found",
                    "flagged_fields": []
                }
            
            # Check if already in review
            if extraction.review_status in ['in_review', 'approved', 'rejected']:
                return {
                    "routed": False,
                    "reason": f"Already in review status: {extraction.review_status}",
                    "flagged_fields": []
                }
            
            # Determine if should route to review
            should_route, reason, flagged_fields = self.should_route_to_review(extraction, template)
            
            if should_route:
                # Update extraction status to in_review
                extraction.review_status = 'in_review'
                extraction.assigned_reviewer = 'auto_router'  # Could be enhanced with actual reviewer assignment
                self.db.commit()
                
                logger.info(f"Auto-routed extraction {extraction_id} to review: {reason}")
                
                return {
                    "routed": True,
                    "reason": reason,
                    "flagged_fields": flagged_fields,
                    "review_status": "in_review"
                }
            else:
                return {
                    "routed": False,
                    "reason": reason,
                    "flagged_fields": []
                }
                
        except Exception as e:
            logger.error(f"Failed to auto-route extraction {extraction_id}: {str(e)}")
            return {
                "routed": False,
                "reason": f"Error during routing: {str(e)}",
                "flagged_fields": []
            }
    
    def get_review_priority(self, extraction: Extraction, template: Template) -> str:
        """
        Determine review priority based on confidence scores and field importance
        
        Returns:
            Priority level: 'high', 'medium', 'low'
        """
        if not extraction.results or not extraction.confidence_scores:
            return 'low'
        
        # Get confidence threshold
        confidence_threshold = self._get_confidence_threshold(template)
        
        # Detect low-confidence fields
        detection = detectLowConfidenceFields(
            extraction.results,
            extraction.confidence_scores,
            confidence_threshold
        )
        
        # High priority: Many flagged fields or very low overall confidence
        overall_confidence = extraction.confidence_scores.get('overall', 0)
        if detection.flagged_count >= 5 or overall_confidence < 0.3:
            return 'high'
        
        # Medium priority: Some flagged fields or low overall confidence
        if detection.flagged_count >= 2 or overall_confidence < 0.6:
            return 'medium'
        
        # Low priority: Few or no flagged fields
        return 'low'
    
    def get_reviewer_recommendations(self, extraction: Extraction, template: Template) -> List[str]:
        """
        Get recommended reviewers based on extraction characteristics
        
        Returns:
            List of recommended reviewer IDs or usernames
        """
        # This is a placeholder for more sophisticated reviewer assignment
        # In a real implementation, this could consider:
        # - Reviewer expertise in document types
        # - Reviewer workload
        # - Historical review performance
        # - Field-specific expertise
        
        priority = self.get_review_priority(extraction, template)
        
        if priority == 'high':
            return ['senior_reviewer_1', 'senior_reviewer_2']
        elif priority == 'medium':
            return ['reviewer_1', 'reviewer_2']
        else:
            return ['reviewer_1']
    
    def _get_confidence_threshold(self, template: Template) -> float:
        """Get confidence threshold from template settings"""
        if not template.extraction_settings:
            return 0.7  # Default threshold
        
        return template.extraction_settings.get('confidence_threshold', 0.7)
    
    def get_extraction_confidence_summary(self, extraction: Extraction) -> Dict[str, any]:
        """
        Get a summary of confidence scores for an extraction
        
        Returns:
            Dict with confidence summary
        """
        if not extraction.results or not extraction.confidence_scores:
            return {
                "overall_confidence": 0.0,
                "flagged_fields_count": 0,
                "total_fields": 0,
                "confidence_breakdown": {}
            }
        
        # Get template for threshold
        template = self.db.query(Template).filter(Template.id == extraction.template_id).first()
        confidence_threshold = self._get_confidence_threshold(template) if template else 0.7
        
        # Detect low-confidence fields
        detection = detectLowConfidenceFields(
            extraction.results,
            extraction.confidence_scores,
            confidence_threshold
        )
        
        return {
            "overall_confidence": extraction.confidence_scores.get('overall', 0.0),
            "flagged_fields_count": detection.flagged_count,
            "total_fields": detection.totalFields,
            "confidence_threshold": confidence_threshold,
            "flagged_fields": [
                {
                    "path": field.path,
                    "name": field.name,
                    "confidence": field.confidence,
                    "threshold": field.threshold
                }
                for field in detection.flagged_fields
            ],
            "confidence_breakdown": extraction.confidence_scores
        }
