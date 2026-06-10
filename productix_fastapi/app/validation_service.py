"""
Data Validation Service for Alert Notifications
Validates data entries and generates alerts for issues
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from .schemas import AlertCreate, ValidationResult


class ValidationService:
    """Service for validating data and generating alerts"""
    
    @staticmethod
    def validate_shift_entry(data: Dict[str, Any]) -> ValidationResult:
        """
        Validate shift entry data and generate alerts for issues
        """
        alerts: List[AlertCreate] = []
        warnings: List[str] = []
        
        input_materials = data.get("input_materials", {})
        output_products = data.get("output_products", {})
        
        # Check for zero values in inputs
        for material_name, material_data in input_materials.items():
            if isinstance(material_data, dict):
                amount = material_data.get("amount", 0)
                if amount == 0:
                    warnings.append(f"Input material '{material_name}' has zero value. Please verify if this is correct.")
        
        # Check for zero values in outputs
        for product_name, product_data in output_products.items():
            if isinstance(product_data, dict):
                amount = product_data.get("amount", 0)
                if amount == 0:
                    alerts.append(AlertCreate(
                        alert_type="data_quality",
                        severity="warning",
                        title=f"Zero Output: {product_name}",
                        message=f"Output product '{product_name}' has zero value. This may indicate production issues.",
                        entity_type="shift_entry",
                        data_context={"field": product_name, "value": amount, "issue": "zero_output"}
                    ))
        
        # Check for missing unit prices
        for material_name, material_data in input_materials.items():
            if isinstance(material_data, dict):
                amount = material_data.get("amount", 0)
                unit_price = material_data.get("unit_price")
                if amount > 0 and unit_price is None:
                    alerts.append(AlertCreate(
                        alert_type="data_quality",
                        severity="warning",
                        title=f"Missing Unit Price: {material_name}",
                        message=f"Input material '{material_name}' is used (amount: {amount}) but has no unit price. Cost calculations may be inaccurate.",
                        entity_type="shift_entry",
                        data_context={"field": material_name, "amount": amount, "issue": "missing_unit_price"}
                    ))
        
        # Check for logical inconsistencies (output > input scenarios)
        total_input_cost = 0
        total_output = 0
        
        for material_data in input_materials.values():
            if isinstance(material_data, dict):
                amount = material_data.get("amount", 0)
                unit_price = material_data.get("unit_price", 0)
                total_input_cost += amount * (unit_price or 0)
        
        for product_data in output_products.values():
            if isinstance(product_data, dict):
                amount = product_data.get("amount", 0)
                total_output += amount
        
        # Check if outputs are unusually high compared to inputs
        if total_input_cost > 0 and total_output > 0:
            productivity_ratio = total_output / total_input_cost
            if productivity_ratio > 1000:  # Arbitrary threshold for unusual productivity
                alerts.append(AlertCreate(
                    alert_type="logical_error",
                    severity="warning",
                    title="Unusual Productivity Ratio Detected",
                    message=f"Productivity ratio is unusually high ({productivity_ratio:.2f}). Please verify the data accuracy.",
                    entity_type="shift_entry",
                    data_context={
                        "total_input_cost": total_input_cost,
                        "total_output": total_output,
                        "productivity_ratio": productivity_ratio,
                        "issue": "unusual_productivity"
                    }
                ))
        
        # Check if all inputs are zero but outputs are positive
        if total_input_cost == 0 and total_output > 0:
            alerts.append(AlertCreate(
                alert_type="logical_error",
                severity="critical",
                title="Zero Input Cost With Positive Output",
                message=f"Total output is {total_output} but total input cost is zero. This is logically inconsistent.",
                entity_type="shift_entry",
                data_context={
                    "total_input_cost": total_input_cost,
                    "total_output": total_output,
                    "issue": "zero_input_positive_output"
                }
            ))
        
        return ValidationResult(
            is_valid=len([a for a in alerts if a.severity == "critical"]) == 0,
            alerts=alerts,
            warnings=warnings
        )
    
    @staticmethod
    def validate_data_record(data: Dict[str, Any], product_fields: Dict[str, List[str]]) -> ValidationResult:
        """
        Validate product data record and generate alerts for issues
        """
        alerts: List[AlertCreate] = []
        warnings: List[str] = []
        
        record_data = data.get("data", {})
        input_fields = product_fields.get("input_fields", [])
        output_fields = product_fields.get("output_fields", [])
        
        # Check input fields for non-numeric values
        for field in input_fields:
            if field in record_data:
                value = record_data[field]
                try:
                    float(value)
                except (ValueError, TypeError):
                    warnings.append(f"Field '{field}' has a non-numeric value: {value}")
        
        # Check output fields for zero values and non-numeric
        for field in output_fields:
            if field in record_data:
                value = record_data[field]
                try:
                    numeric_value = float(value)
                    if numeric_value == 0:
                        alerts.append(AlertCreate(
                            alert_type="data_quality",
                            severity="warning",
                            title=f"Zero Output: {field}",
                            message=f"Output field '{field}' has zero value. This may indicate production issues.",
                            entity_type="data_record",
                            data_context={"field": field, "value": numeric_value, "issue": "zero_output"}
                        ))
                except (ValueError, TypeError):
                    warnings.append(f"Field '{field}' has a non-numeric value: {value}")
        
        # Check for missing required fields
        all_fields = input_fields + output_fields
        empty_fields = [field for field in all_fields if field in record_data and record_data[field] in [None, "", " "]]
        if empty_fields:
            alerts.append(AlertCreate(
                alert_type="data_quality",
                severity="warning",
                title="Empty Fields Detected",
                message=f"The following fields are empty: {', '.join(empty_fields)}. Please verify the data.",
                entity_type="data_record",
                data_context={"empty_fields": empty_fields, "issue": "empty_fields"}
            ))
        
        return ValidationResult(
            is_valid=len([a for a in alerts if a.severity == "critical"]) == 0,
            alerts=alerts,
            warnings=warnings
        )
    
    @staticmethod
    def validate_unit_data(unit_data: Dict[str, Any], customer_data: List[Dict[str, Any]]) -> ValidationResult:
        """
        Validate unit and customer data and generate alerts for issues
        """
        alerts: List[AlertCreate] = []
        warnings: List[str] = []
        
        # Validate unit data — only warn on non-numeric, no negative checks
        for key, value in unit_data.items():
            if key.startswith("unit_") or key.startswith("tower_"):
                field_name = key.replace("unit_", "").replace("tower_", "")
                try:
                    float(value)
                except (ValueError, TypeError):
                    if value not in [None, "", " "]:
                        warnings.append(f"Unit field '{field_name}' has a non-numeric value: {value}")
        
        # Validate customer data — only warn on non-numeric, no negative checks
        for customer_row in customer_data:
            for key, value in customer_row.items():
                if key.startswith("customer_") or key.startswith("tenant_"):
                    field_name = key.replace("customer_", "").replace("tenant_", "")
                    try:
                        float(value)
                    except (ValueError, TypeError):
                        if value not in [None, "", " "]:
                            warnings.append(f"Customer field '{field_name}' has a non-numeric value: {value}")
        
        return ValidationResult(
            is_valid=len([a for a in alerts if a.severity == "critical"]) == 0,
            alerts=alerts,
            warnings=warnings
        )

    @staticmethod
    def validate_tower_data(tower_data: Dict[str, Any], tenant_data: List[Dict[str, Any]]) -> ValidationResult:
        """Deprecated: wrapper for backward compatibility"""
        return ValidationService.validate_unit_data(tower_data, tenant_data)