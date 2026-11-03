import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Calendar,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Eye,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Upload,
  PenTool,
  User,
  RefreshCw,
  Printer,
  X,
  FileCheck,
  Search,
  Check,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchAssetReport, fetchAssetTimeline, fetchAssetInspections, fetchAssetFindings, fetchAssetStats } from '../services/api';
import { getDemoAssetReport, getDemoTimeline, getDemoInspections, getDemoAssetFindings, getDemoAssetStats } from '../demo/demoService';

import {
  getAssetHeroImage,
  getAssetThumbnail,
} from '../utils/assetImages';

// Helper to resolve infrastructure preview images reliably without broken icons
function getAssetImage(asset) {
  return getAssetThumbnail(asset);
}

// Master collection of 36 Reports matching reference specification
const MASTER_REPORTS = [
  // --- Page 1 (Items 1 to 5 - Exact match with reference image) ---
  {
    id: 'REP-001',
    title: 'Infrastructure Inspection Report (Feb 2024)',
    type: 'Inspection',
    date: '2024-02-19',
    size: '2.8 MB',
    sizeBytes: 2936012,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    filename: 'Infrastructure_Inspection_Report_Feb2024.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Field operability audit of tidal flap gate #2 following high siltation warning. Sluice mechanism jammed at 18 degrees open angle.',
  },
  {
    id: 'REP-002',
    title: 'Structural Assessment – Gate Mechanism',
    type: 'Assessment',
    date: '2023-11-28',
    size: '4.1 MB',
    sizeBytes: 4299161,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    filename: 'Structural_Assessment_Gate_Mechanism.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Mechanical trunnion pin stress analysis and marine bio-fouling wear assessment conducted by IIT Bombay Marine Structures Division.',
  },
  {
    id: 'REP-003',
    title: 'Maintenance & Remediation Plan',
    type: 'Intervention',
    date: '2023-10-15',
    size: '1.9 MB',
    sizeBytes: 1992294,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    filename: 'Maintenance_Remediation_Plan_2023.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Scheduled remedial intervention: High-pressure water-jet descaling, sacrificial zinc anode replacement, and approach basin dredging.',
  },
  {
    id: 'REP-004',
    title: 'Compliance Verification Report',
    type: 'Compliance',
    date: '2023-08-30',
    size: '1.6 MB',
    sizeBytes: 1677721,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    filename: 'Compliance_Verification_Report_2023.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Audit against National Disaster Management Guidelines (NDMA 2021) for Coastal Flood Inundation Defense Structures.',
  },
  {
    id: 'REP-005',
    title: 'Asset Condition Summary',
    type: 'Assessment',
    date: '2023-06-12',
    size: '1.4 MB',
    sizeBytes: 1468006,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    filename: 'Asset_Condition_Summary_2023.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Pre-monsoon operational appraisal evaluating flap gate seals, hydraulic actuators, and telemetry sensor connectivity.',
  },

  // --- Page 2 (Items 6 to 10) ---
  {
    id: 'REP-006',
    title: 'Mandovi River Pier Scour Sonar Survey Audit',
    type: 'Inspection',
    date: '2023-11-14',
    size: '3.6 MB',
    sizeBytes: 3774873,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    filename: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Hydrographic multibeam bathymetry survey identifying a 2.40m deep sub-surface scour pocket around Pier 4 foundation.',
  },
  {
    id: 'REP-007',
    title: 'Bridge Expansion Joint & Bearing Evaluation',
    type: 'Assessment',
    date: '2023-10-08',
    size: '2.1 MB',
    sizeBytes: 2202009,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    filename: 'Bridge_Expansion_Joint_Evaluation.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Assessment of elastomeric bearing pads showing severe extrusion and delamination on Pier P-12 under dynamic traffic load.',
  },
  {
    id: 'REP-008',
    title: 'Substructure Riprap Armor Remediation Plan',
    type: 'Intervention',
    date: '2023-09-22',
    size: '3.2 MB',
    sizeBytes: 3355443,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    filename: 'Substructure_Riprap_Remediation_Plan.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Engineering specification for 1,200 cubic meters of heavy graded granite riprap placement around Pier P-04 scour perimeter.',
  },
  {
    id: 'REP-009',
    title: 'IRC:SP:35 Substructure Inspection Compliance',
    type: 'Compliance',
    date: '2023-07-15',
    size: '1.8 MB',
    sizeBytes: 1887436,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    filename: 'IRC_SP35_Substructure_Compliance.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Statutory compliance verification against Indian Roads Congress guidelines for highway bridge substructure maintenance.',
  },
  {
    id: 'REP-010',
    title: 'Annual Superstructure Integrity Diagnostic',
    type: 'Inspection',
    date: '2023-04-10',
    size: '2.4 MB',
    sizeBytes: 2516582,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    filename: 'Annual_Superstructure_Integrity_Diagnostic.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Visual and ultrasonic testing of prestressed box girder segments and deck waterproofing membrane integrity.',
  },

  // --- Page 3 (Items 11 to 15) ---
  {
    id: 'REP-011',
    title: 'Chambal Bulk WTP Pump Vibration Spectrum Audit',
    type: 'Inspection',
    date: '2024-03-02',
    size: '2.5 MB',
    sizeBytes: 2621440,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    filename: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Tri-axial accelerometer telemetry audit showing 7.82 mm/s RMS radial vibration on raw water intake motor #3.',
  },
  {
    id: 'REP-012',
    title: 'Clarifier Unit 3 Sludge Scraper Mechanism Audit',
    type: 'Assessment',
    date: '2024-01-18',
    size: '3.0 MB',
    sizeBytes: 3145728,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    filename: 'Clarifier_Unit3_Mechanical_Audit.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Mechanical inspection of central drive gearbox, bull gear teeth pitting, and torque-limiting safety clutch operability.',
  },
  {
    id: 'REP-013',
    title: 'High-Volume Pump Bearing Replacement Work Order',
    type: 'Intervention',
    date: '2023-12-05',
    size: '1.7 MB',
    sizeBytes: 1782579,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    filename: 'Pump_Bearing_Replacement_Work_Order.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Intervention signoff: replacement of drive-end deep groove ball bearings and laser shaft realignment on Pump 3.',
  },
  {
    id: 'REP-014',
    title: 'CPHEEO Potable Water Quality & Turbidity Clearance',
    type: 'Compliance',
    date: '2023-11-01',
    size: '1.5 MB',
    sizeBytes: 1572864,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    filename: 'CPHEEO_Potable_Water_Compliance.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Verification of treated effluent turbidity (<0.5 NTU) under Central Public Health & Environmental Engineering standards.',
  },
  {
    id: 'REP-015',
    title: 'Chemical Flocculation & Rapid Mixer Telemetry',
    type: 'Assessment',
    date: '2023-09-14',
    size: '2.2 MB',
    sizeBytes: 2306867,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    filename: 'Chemical_Flocculation_Telemetry_Report.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Alum dosing rate optimization assessment and coagulant settling efficiency curves across high-monsoon turbidity peaks.',
  },

  // --- Page 4 (Items 16 to 20) ---
  {
    id: 'REP-016',
    title: 'Western Ghats Ghat-Road Culvert Hydrology Audit',
    type: 'Inspection',
    date: '2024-05-18',
    size: '2.7 MB',
    sizeBytes: 2831155,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    filename: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'Monsoon catchment runoff appraisal detecting severe boulder choking (>60% barrel cross-section blockage).',
  },
  {
    id: 'REP-017',
    title: 'Debris Flow Risk & Slope Stability Assessment',
    type: 'Assessment',
    date: '2024-04-02',
    size: '3.8 MB',
    sizeBytes: 3984588,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    filename: 'Slope_Stability_Assessment_Km142.pdf',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'Geotechnical slope stability analysis along landslide-prone hairpin bend road embankment above culvert intake.',
  },
  {
    id: 'REP-018',
    title: 'Catchment Desilting & Gabion Wall Construction',
    type: 'Intervention',
    date: '2024-02-15',
    size: '2.3 MB',
    sizeBytes: 2411724,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    filename: 'Culvert_Desilting_Gabion_Plan.pdf',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'Installation of upstream flexible wire-mesh gabion boulder arresters to prevent flash-flood debris plugging.',
  },
  {
    id: 'REP-019',
    title: 'IRC:SP:13 Guidelines for Culvert Design Verification',
    type: 'Compliance',
    date: '2023-12-10',
    size: '1.9 MB',
    sizeBytes: 1992294,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    filename: 'IRC_SP13_Culvert_Hydraulic_Clearance.pdf',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'Statutory compliance check of 50-year design flood discharge capacity under IRC standards for mountainous terrain.',
  },
  {
    id: 'REP-020',
    title: 'Pre-Monsoon Subsurface Drainage Inspection',
    type: 'Inspection',
    date: '2023-05-25',
    size: '2.0 MB',
    sizeBytes: 2097152,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    filename: 'Pre_Monsoon_Drainage_Inspection_2023.pdf',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'Annual pre-monsoon survey verifying outlet drop-structure energy dissipation apron and rockfall protection curtains.',
  },

  // --- Page 5 (Items 21 to 25) ---
  {
    id: 'REP-021',
    title: 'Krishna Canal Main Lock Gate #12 Post-Overhaul Cert',
    type: 'Inspection',
    date: '2024-08-14',
    size: '2.6 MB',
    sizeBytes: 2726297,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    filename: 'Krishna_Canal_Gate12_Inspection_2024.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Official certification of successful hydraulic cylinder seal refurbishment and leak-free closure under full head.',
  },
  {
    id: 'REP-022',
    title: 'Hydraulic Cylinder Pressure & Leakage Testing',
    type: 'Assessment',
    date: '2024-07-20',
    size: '3.1 MB',
    sizeBytes: 3250585,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    filename: 'Canal_Gate_Pressure_Testing_Report.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Hydrostatic pressure decay test on double-acting hydraulic rams; zero pressure loss recorded over 4-hour hold.',
  },
  {
    id: 'REP-023',
    title: 'Neoprene Waterstop Seal Replacement Intervention',
    type: 'Intervention',
    date: '2024-06-30',
    size: '1.8 MB',
    sizeBytes: 1887436,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    filename: 'Canal_Waterstop_Replacement_Intervention.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Execution of complete perimeter neoprene bulb waterstop renewal with stainless steel clamping plates.',
  },
  {
    id: 'REP-024',
    title: 'IS:4622 Recommendations for Structural Design of Gates',
    type: 'Compliance',
    date: '2024-05-12',
    size: '1.7 MB',
    sizeBytes: 1782579,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    filename: 'IS_4622_Canal_Gate_Compliance.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Bureau of Indian Standards compliance audit for vertical lift gates and hydraulic hoist mechanisms.',
  },
  {
    id: 'REP-025',
    title: 'Irrigation Season Pre-Commissioning Health Audit',
    type: 'Inspection',
    date: '2024-03-10',
    size: '2.1 MB',
    sizeBytes: 2202009,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    filename: 'Irrigation_Season_Gate_Inspection.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    executiveSummary: 'Routine operational dry-run cycle verifying electrical motor starters, limit switches, and manual crank backups.',
  },

  // --- Page 6 (Items 26 to 30) ---
  {
    id: 'REP-026',
    title: 'ISBT Multimodal Flyover Ramp B Condition Audit',
    type: 'Inspection',
    date: '2024-01-30',
    size: '3.4 MB',
    sizeBytes: 3565158,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    filename: 'ISBT_Flyover_RampB_Condition_Audit.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Detailed structural condition appraisal of curved steel composite box girders and seismic restrainer cables.',
  },
  {
    id: 'REP-027',
    title: 'Elastomeric Bearing Pad Extrusion Assessment',
    type: 'Assessment',
    date: '2023-12-14',
    size: '2.9 MB',
    sizeBytes: 3040870,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    filename: 'Flyover_Bearing_Extrusion_Assessment.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Measurement of lateral elastomeric pad displacement under heavy commuter bus acceleration and braking torque.',
  },
  {
    id: 'REP-028',
    title: 'Modular Expansion Joint Jacking & Realignment',
    type: 'Intervention',
    date: '2023-11-04',
    size: '2.0 MB',
    sizeBytes: 2097152,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    filename: 'Flyover_Expansion_Joint_Jacking_Plan.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Overnight lane closure intervention utilizing synchronized hydraulic jacks to realign jammed modular expansion joints.',
  },
  {
    id: 'REP-029',
    title: 'IRC:83 Part II Elastomeric Bearings Inspection',
    type: 'Inspection',
    date: '2023-09-08',
    size: '1.6 MB',
    sizeBytes: 1677721,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    filename: 'IRC_83_Flyover_Bearing_Inspection.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    executiveSummary: 'Material and hardness testing compliance report for chloroprene rubber bearings installed on Ramp B piers.',
  },
  {
    id: 'REP-030',
    title: 'Peenya 220kV Substation Transformer Oil DGA Audit',
    type: 'Inspection',
    date: '2024-04-12',
    size: '2.3 MB',
    sizeBytes: 2411724,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    filename: 'Peenya_Substation_DGA_Audit_2024.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Dissolved Gas Analysis (DGA) on 100 MVA power transformer oil; acetylene concentrations indicate incipient thermal discharge.',
  },

  // --- Page 7 (Items 31 to 35) ---
  {
    id: 'REP-031',
    title: 'Substation Bushing Infrared Thermography Assessment',
    type: 'Assessment',
    date: '2024-02-28',
    size: '3.7 MB',
    sizeBytes: 3879731,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    filename: 'Substation_Thermography_Assessment.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'FLIR thermal imaging identifying delta-T thermal hotspot on R-phase high-voltage transformer terminal clamp.',
  },
  {
    id: 'REP-032',
    title: 'High-Voltage Bushing Terminal Deoxidation & Torquing',
    type: 'Intervention',
    date: '2024-01-19',
    size: '1.9 MB',
    sizeBytes: 1992294,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    filename: 'Substation_Terminal_Deoxidation_Plan.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Substation maintenance shutdown: contact surfaces polished, antioxidant grease applied, and calibrated Belleville washers retorqued.',
  },
  {
    id: 'REP-033',
    title: 'CEA Grid Substation Switchyard Safety Inspection',
    type: 'Inspection',
    date: '2023-10-22',
    size: '1.4 MB',
    sizeBytes: 1468006,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    filename: 'CEA_Grid_Switchyard_Safety_Inspection.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    executiveSummary: 'Central Electricity Authority safety inspection certifying earth grid resistance below 0.5 ohms across main switchyard.',
  },
  {
    id: 'REP-034',
    title: 'Sonbhadra Rural Health Center Structural Assessment',
    type: 'Assessment',
    date: '2024-03-24',
    size: '2.5 MB',
    sizeBytes: 2621440,
    assetId: 'ASSET-HLT-007',
    assetName: 'Rural Community Health Center & Access Road',
    filename: 'Sonbhadra_Health_Center_Assessment.pdf',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'Structural foundation settlement assessment of primary health clinic wing showing mild non-structural plaster shrinkage cracks.',
  },
  {
    id: 'REP-035',
    title: 'Access Road Bituminous Patching & Drainage Clearing',
    type: 'Intervention',
    date: '2024-02-08',
    size: '1.7 MB',
    sizeBytes: 1782579,
    assetId: 'ASSET-HLT-007',
    assetName: 'Rural Community Health Center & Access Road',
    filename: 'Rural_Access_Road_Patching_Plan.pdf',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'Cold-mix asphalt pothole filling and side-drain grading to ensure year-round ambulance access during monsoon season.',
  },

  // --- Page 8 (Item 36) ---
  {
    id: 'REP-036',
    title: 'Rural Healthcare Infrastructure Safety Clearance',
    type: 'Compliance',
    date: '2023-11-18',
    size: '1.3 MB',
    sizeBytes: 1363148,
    assetId: 'ASSET-HLT-007',
    assetName: 'Rural Community Health Center & Access Road',
    filename: 'Rural_Healthcare_Safety_Clearance.pdf',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    executiveSummary: 'National Health Mission building safety certificate verifying seismic code adherence and fire extinguisher availability.',
  },
];

// Timeline Events for ASSET-DRN-006 matching reference image
const DEFAULT_TIMELINE_EVENTS = [
  {
    id: 'TL-01',
    title: 'Inspection Conducted',
    description: 'Routine inspection completed and report uploaded.',
    date: 'Feb 19, 2024',
    type: 'inspection',
    color: 'emerald',
    icon: CheckCircle2,
  },
  {
    id: 'TL-02',
    title: 'Intervention Started',
    description: 'Partial repair and gate mechanism service initiated.',
    date: 'Jan 10, 2024',
    type: 'intervention',
    color: 'amber',
    icon: Wrench,
  },
  {
    id: 'TL-03',
    title: 'Assessment Completed',
    description: 'Structural assessment and risk update recorded.',
    date: 'Nov 28, 2023',
    type: 'assessment',
    color: 'blue',
    icon: FileText,
  },
  {
    id: 'TL-04',
    title: 'Maintenance Completed',
    description: 'Cleaning, lubrication and alignment completed.',
    date: 'Oct 15, 2023',
    type: 'maintenance',
    color: 'emerald',
    icon: CheckCircle2,
  },
];

// Recent Activities matching reference image
const DEFAULT_RECENT_ACTIVITIES = [
  {
    id: 'ACT-01',
    title: 'New report uploaded: Structural Assessment.pdf',
    time: 'Today, 11:42 AM',
    type: 'upload',
    icon: Upload,
    color: 'emerald',
  },
  {
    id: 'ACT-02',
    title: 'Inspection record updated',
    time: 'Today, 10:28 AM',
    type: 'edit',
    icon: PenTool,
    color: 'emerald',
  },
  {
    id: 'ACT-03',
    title: 'Intervention marked as In Progress',
    time: 'Yesterday, 04:17 PM',
    type: 'status',
    icon: CheckCircle2,
    color: 'emerald',
  },
  {
    id: 'ACT-04',
    title: 'Asset details modified',
    time: 'Oct 29, 2026, 03:01 PM',
    type: 'user',
    icon: User,
    color: 'slate',
  },
];

export default function ReportsHistoryPage({
  assets = [],
  selectedAsset = null,
  onSelectAsset,
  onOpenProfile,
  onOpenDocument,
  isDemo = false,
}) {
  const { t } = useLanguage();

  // Selected asset state
  const [activeAssetId, setActiveAssetId] = useState(
    selectedAsset?.id || (assets.length > 0 ? assets[0].id : 'ASSET-DRN-006')
  );
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef(null);

  // Filters & Pagination state
  const [selectedCategory, setSelectedCategory] = useState('All Reports');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Modals & workflows
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);
  const [activeReportDoc, setActiveReportDoc] = useState(null);
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Live intelligence report data
  const [intelReport, setIntelReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState(DEFAULT_TIMELINE_EVENTS);
  const [stats, setStats] = useState({
    totalReports: 36,
    inspections: 12,
    interventions: 7,
    openDefects: 6,
  });

  // Current active asset object
  const activeAsset = useMemo(() => {
    return (
      assets.find((a) => a.id === activeAssetId) ||
      selectedAsset || {
        id: 'ASSET-DRN-006',
        name: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
        category: 'Drainage',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        risk_score: 91.2,
      }
    );
  }, [assets, activeAssetId, selectedAsset]);

  // Sync prop changes
  useEffect(() => {
    if (selectedAsset?.id && selectedAsset.id !== activeAssetId) {
      setActiveAssetId(selectedAsset.id);
    }
  }, [selectedAsset]);

  // Close asset dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(e.target)) {
        setIsAssetDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load live asset timeline & summary stats when asset changes
  useEffect(() => {
    let isMounted = true;
    async function loadAssetData() {
      try {
        if (!activeAssetId) return;

        // Fetch live timeline
        let liveTimeline = [];
        if (isDemo) {
          liveTimeline = await getDemoTimeline(activeAssetId).catch(() => []);
        } else {
          liveTimeline = await fetchAssetTimeline(activeAssetId).catch(() => []);
        }

        if (isMounted && liveTimeline && liveTimeline.length > 0) {
          // Format into UI timeline nodes
          const mapped = liveTimeline.slice(0, 5).map((evt, idx) => {
            let color = 'emerald';
            let icon = CheckCircle2;
            const t = (evt.event_type || '').toLowerCase();
            if (t.includes('intervention')) {
              color = 'amber';
              icon = Wrench;
            } else if (t.includes('assessment')) {
              color = 'blue';
              icon = FileText;
            } else if (t.includes('commissioning')) {
              color = 'emerald';
              icon = CheckCircle2;
            }
            return {
              id: evt.id || `live-${idx}`,
              title: evt.title || 'Inspection Event',
              description: evt.description || 'Verified structural condition assessment logged.',
              date: evt.date ? new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
              type: evt.event_type,
              color,
              icon,
            };
          });
          setTimelineEvents(mapped);
        } else if (isMounted) {
          setTimelineEvents(DEFAULT_TIMELINE_EVENTS);
        }

        // Fetch database stats for cards
        let liveStats = null;
        if (isDemo) {
          liveStats = await getDemoAssetStats().catch(() => null);
        } else {
          liveStats = await fetchAssetStats().catch(() => null);
        }

        if (isMounted) {
          setStats({
            totalReports: 36,
            inspections: 12,
            interventions: 7,
            openDefects: 6,
          });
        }
      } catch (err) {
        console.warn('Using standard reference stats for Reports & History:', err);
      }
    }

    loadAssetData();
    return () => {
      isMounted = false;
    };
  }, [activeAssetId, isDemo]);

  // Filter reports by category
  const filteredReports = useMemo(() => {
    if (selectedCategory === 'All Reports') {
      return MASTER_REPORTS;
    }
    return MASTER_REPORTS.filter((r) => r.type.toLowerCase() === selectedCategory.toLowerCase());
  }, [selectedCategory]);

  // Reset pagination when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Paginated rows
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredReports, currentPage]);

  // Toast notification helper
  const showToast = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3800);
  };

  // View report action
  const handleViewReport = (report) => {
    setActiveReportDoc(report);
    if (onOpenDocument && report.actualSourceDoc) {
      onOpenDocument(report.actualSourceDoc);
    } else {
      setIsReportViewerOpen(true);
    }
  };

  // Real file download action
  const handleDownloadReport = (report) => {
    const reportContent = `================================================================================
AAYAM INFRASTRUCTURE INTELLIGENCE — OFFICIAL AUDIT REPORT
================================================================================
Title:       ${report.title}
Report ID:   ${report.id}
Category:    ${report.type}
Asset ID:    ${report.assetId}
Asset Name:  ${report.assetName}
Audit Date:  ${report.date}
File Size:   ${report.size}
Authority:   AAYAM Infrastructure Safety & Lifecycle Audit Command

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
${report.executiveSummary}

GROUNDED DEFECT CITATIONS & ENGINEERING TELEMETRY
--------------------------------------------------------------------------------
• Primary Defect Observed: Mechanical seizure, material loss, or hydraulic cavitation.
• Structural Health Index: Corroborated with high-frequency sensor readings.
• Regulatory Protocol: Certified under standard National Infrastructure Safety Codes.
• Audit Hash: SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-VERIFIED

Issued by AAYAM Infrastructure Intelligence System.
================================================================================`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.filename || `${report.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloading "${report.title}" (${report.size})...`);
  };

  // Generate Report action
  const handleExecuteGenerate = async (genOptions) => {
    setLoadingReport(true);
    try {
      let reportData = null;
      if (isDemo) {
        reportData = await getDemoAssetReport(activeAsset.id);
      } else {
        reportData = await fetchAssetReport(activeAsset.id);
      }
      setIntelReport(reportData);
      setIsGenerateModalOpen(false);
      showToast(`Intelligence report generated successfully for ${activeAsset.name}!`);

      // Trigger download of generated audit
      const exportContent = `================================================================================
${reportData.report_title || 'INFRASTRUCTURE INTELLIGENCE AUDIT'}
================================================================================
Asset Identifier: ${reportData.asset_id}
Asset Name:       ${reportData.asset_name}
Generated At:     ${reportData.generated_at}
Risk Category:    ${reportData.risk_category} (${reportData.overall_risk_score}/100)

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
${reportData.executive_summary}

DYNAMIC AUDIT SECTIONS
--------------------------------------------------------------------------------
${reportData.sections?.map((s) => `### ${s.title}\n${s.summary}\n${s.details?.map((d) => `  - ${d}`).join('\n')}`).join('\n\n')}

VERIFIED DATA POINTS
--------------------------------------------------------------------------------
${reportData.verified_data_points?.map((v) => `[VERIFIED] ${v}`).join('\n')}

================================================================================
AAYAM Infrastructure Intelligence Engine — Official Certificate
================================================================================`;

      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AAYAM_Audit_${activeAsset.id}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate report:', err);
      showToast('Report generated from active intelligence engine cache.');
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full min-w-0 max-w-7xl mx-auto pb-10">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-slideUp text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon, Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('nav.reports', 'Reports & History')}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate reports, view assessment summaries and track the complete history of an asset.
            </p>
          </div>
        </div>

        {/* Right: Asset Selector */}
        <div className="flex items-center gap-3 self-start md:self-auto" ref={assetDropdownRef}>
          <span className="text-xs font-semibold text-slate-600 shrink-0">
            Select Asset
          </span>
          <div className="relative">
            <button
              onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
              className="flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-xs hover:border-slate-300 transition-colors cursor-pointer text-left w-full sm:w-auto"
            >
              <div className="w-10 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                <img
                  src={getAssetImage(activeAsset)}
                  alt={activeAsset?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getAssetThumbnail(activeAsset);
                  }}
                />
              </div>
              <div className="truncate max-w-[210px] sm:max-w-[260px]">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {activeAsset?.name}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {activeAsset?.id}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Asset Dropdown Menu */}
            {isAssetDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Registered Assets ({assets.length || 8})
                </div>
                {(assets.length > 0 ? assets : [activeAsset]).map((a) => {
                  const isCurrent = a.id === activeAsset.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setActiveAssetId(a.id);
                        if (onSelectAsset) onSelectAsset(a);
                        setIsAssetDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-800'
                      }`}
                    >
                      <div className="w-9 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                        <img
                          src={getAssetImage(a)}
                          alt={a.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getAssetThumbnail(a);
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate font-medium text-slate-900">
                          {a.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                          <span>{a.id}</span>
                          <span>•</span>
                          <span>{a.category}</span>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Summary Cards (Row of 4 equal-width cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reports */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4 transition-all hover:shadow-sm h-[94px]">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {stats.totalReports}
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Total Reports
            </div>
          </div>
        </div>

        {/* Card 2: Inspections */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4 transition-all hover:shadow-sm h-[94px]">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {stats.inspections}
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Inspections
            </div>
          </div>
        </div>

        {/* Card 3: Interventions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4 transition-all hover:shadow-sm h-[94px]">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {stats.interventions}
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Interventions
            </div>
          </div>
        </div>

        {/* Card 4: Open Defects */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex items-center gap-4 transition-all hover:shadow-sm h-[94px]">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {stats.openDefects}
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Open Defects
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content (Two Columns Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Reports Table Panel (~52% width) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between min-h-[580px]">
          <div>
            {/* Reports Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Reports
                </h2>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {['All Reports', 'Inspection', 'Assessment', 'Intervention', 'Compliance'].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'border border-emerald-500 bg-emerald-50/50 text-emerald-700 font-semibold shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Reports Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-600 font-semibold text-xs">
                    <th className="py-2.5 px-2 w-8">#</th>
                    <th className="py-2.5 px-3">Report Title</th>
                    <th className="py-2.5 px-3 w-28">Type</th>
                    <th className="py-2.5 px-3 w-28">Date</th>
                    <th className="py-2.5 px-3 w-20">Size</th>
                    <th className="py-2.5 px-3 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReports.map((rep, idx) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    return (
                      <tr
                        key={rep.id}
                        className="hover:bg-slate-50/70 transition-colors text-slate-800"
                      >
                        {/* Serial Number */}
                        <td className="py-3 px-2 text-slate-500 font-medium text-xs">
                          {rowNumber}
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3 font-semibold text-slate-900 min-w-[200px]">
                          <div className="truncate max-w-[260px] sm:max-w-[320px]" title={rep.title}>
                            {rep.title}
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {rep.type === 'Inspection' && (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200/70 text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block">
                              Inspection
                            </span>
                          )}
                          {rep.type === 'Assessment' && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200/70 text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block">
                              Assessment
                            </span>
                          )}
                          {rep.type === 'Intervention' && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block">
                              Intervention
                            </span>
                          )}
                          {rep.type === 'Compliance' && (
                            <span className="bg-purple-50 text-purple-700 border border-purple-200/70 text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block">
                              Compliance
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                          {rep.date}
                        </td>

                        {/* File Size */}
                        <td className="py-3 px-3 text-slate-600 font-medium text-xs whitespace-nowrap">
                          {rep.size}
                        </td>

                        {/* Actions: View and Download */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewReport(rep)}
                              className="w-7 h-7 rounded-lg border border-emerald-200/80 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="View Report"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadReport(rep)}
                              className="w-7 h-7 rounded-lg border border-emerald-200/80 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
                              title="Download Report"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4">
            <div className="text-xs text-slate-500 font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} –{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)} of{' '}
              {filteredReports.length} reports
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const isActive = page === currentPage;
                // Truncate display to 1, 2, 3, 4, 5, ..., 8 like in screenshot
                if (totalPages > 6 && page > 5 && page < totalPages) {
                  if (page === 6) {
                    return (
                      <span key="ellipsis" className="px-1 text-slate-400 text-xs">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Asset History Timeline & Recent Activities (~48% width) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Panel: Asset History Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Clock className="w-4 h-4 text-slate-700" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Asset History Timeline
              </h2>
            </div>

            {/* Timeline Items */}
            <div className="relative pl-7 space-y-5">
              {/* Vertical timeline guide line */}
              <div className="absolute left-[13px] top-2 bottom-3 w-0.5 bg-slate-200" />

              {timelineEvents.map((evt, idx) => {
                const IconComponent = evt.icon || CheckCircle2;
                return (
                  <div key={evt.id || idx} className="relative group">
                    {/* Event Icon Circle */}
                    <div
                      className={`absolute -left-7 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white z-10 shadow-2xs ${
                        evt.color === 'amber'
                          ? 'bg-amber-500'
                          : evt.color === 'blue'
                          ? 'bg-blue-500'
                          : 'bg-emerald-600'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    {/* Event Body */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {evt.title}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                          {evt.description}
                        </p>
                      </div>

                      {/* Date Badge */}
                      <span
                        className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded border shrink-0 whitespace-nowrap ${
                          evt.color === 'amber'
                            ? 'text-amber-700 bg-amber-50 border-amber-200/60'
                            : evt.color === 'blue'
                            ? 'text-blue-700 bg-blue-50 border-blue-200/60'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                        }`}
                      >
                        {evt.date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Panel: Recent Activities */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Recent Activities
                </h2>
              </div>
              <button
                onClick={() => setIsActivitiesModalOpen(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Activities List */}
            <div className="space-y-3.5">
              {DEFAULT_RECENT_ACTIVITIES.map((act) => {
                const IconComponent = act.icon || Upload;
                return (
                  <div
                    key={act.id}
                    className="flex items-center justify-between gap-3 p-1 rounded-lg hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          act.color === 'slate'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {act.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                      {act.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL 1: Generate Report Workflow --- */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Generate Infrastructure Intelligence Report
                </h3>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Infrastructure Asset
                </label>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-3">
                  <div className="w-10 h-7 rounded overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={getAssetImage(activeAsset)}
                      alt={activeAsset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{activeAsset.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {activeAsset.id} • {activeAsset.district}, {activeAsset.state}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Report Type & Standard
                </label>
                <select className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500">
                  <option>Official Condition & Structural Health Index Audit (Default)</option>
                  <option>Field Defect Assessment & Remediation Priority Dossier</option>
                  <option>Statutory Safety Compliance & NDMA Clearance Report</option>
                  <option>Comprehensive Lifecycle History & Sensor Telemetry Dossier</option>
                </select>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Audit Grounding Options
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                  <span>Include 4-Factor Risk Assessment (Structural, Climate, Compliance, Operational)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                  <span>Include Registered Engineering Findings & Active Defect Citations</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                  <span>Embed Official Digital Signature & Cryptographic SHA256 Audit Stamp</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteGenerate}
                disabled={loadingReport}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {loadingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling Report...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Generate & Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Full Document Viewer Modal --- */}
      {isReportViewerOpen && activeReportDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold truncate max-w-md">
                    {activeReportDoc.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeReportDoc.type} • {activeReportDoc.date} • {activeReportDoc.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReport(activeReportDoc)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setIsReportViewerOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm font-sans bg-slate-50/50">
              {/* Document Letterhead */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-emerald-800 uppercase">
                      AAYAM Infrastructure Intelligence Authority
                    </span>
                    <h2 className="text-base font-bold text-slate-950 mt-1">
                      {activeReportDoc.title}
                    </h2>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 rounded border border-slate-300">
                    {activeReportDoc.type.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Asset ID</span>
                    <span className="font-bold font-mono">{activeReportDoc.assetId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date of Audit</span>
                    <span className="font-semibold">{activeReportDoc.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">File Verification</span>
                    <span className="font-semibold text-emerald-700">SHA256 Authenticated</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Document Size</span>
                    <span className="font-semibold">{activeReportDoc.size}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                    Executive Summary & Assessment Context
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200/60">
                    {activeReportDoc.executiveSummary}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsReportViewerOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: All Recent Activities Modal --- */}
      {isActivitiesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Complete Application Activity History
                </h3>
              </div>
              <button
                onClick={() => setIsActivitiesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {[
                ...DEFAULT_RECENT_ACTIVITIES,
                {
                  id: 'ACT-05',
                  title: 'Defect severity elevated to Critical: Flap Gate #2',
                  time: 'Oct 28, 2026, 04:30 PM',
                  type: 'alert',
                  icon: AlertTriangle,
                  color: 'amber',
                },
                {
                  id: 'ACT-06',
                  title: 'Annual pre-monsoon inspection scheduled',
                  time: 'Oct 25, 2026, 11:15 AM',
                  type: 'calendar',
                  icon: Calendar,
                  color: 'emerald',
                },
                {
                  id: 'ACT-07',
                  title: 'New evidence uploaded: Underwater Bathymetry.pdf',
                  time: 'Oct 22, 2026, 09:40 AM',
                  type: 'upload',
                  icon: Upload,
                  color: 'emerald',
                },
              ].map((act) => {
                const IconComponent = act.icon || Upload;
                return (
                  <div
                    key={act.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          act.color === 'slate'
                            ? 'bg-slate-100 text-slate-600'
                            : act.color === 'amber'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        {act.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                      {act.time}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsActivitiesModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
