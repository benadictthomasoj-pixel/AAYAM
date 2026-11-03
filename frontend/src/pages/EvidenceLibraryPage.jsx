import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Search,
  Plus,
  Download,
  Maximize2,
  Eye,
  MoreVertical,
  Calendar,
  Database,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Layers,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  X,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import EvidenceViewerModal from '../components/EvidenceViewerModal';
import { useLanguage } from '../context/LanguageContext';
import { fetchEvidenceCatalog, fetchAssetMedia } from '../services/api';
import { getDemoEvidenceCatalog } from '../demo/demoService';
import aayamHeroLandscape from '../assets/aayam-hero-landscape.png';
import mandoviBridgeThumbnail from '../assets/mandovi-bridge-thumbnail.jpg';

import {
  getAssetHeroImage,
  getAssetThumbnail,
} from '../utils/assetImages';

// Helper to resolve infrastructure preview images
function getAssetImage(asset) {
  return getAssetThumbnail(asset);
}

// Master evidence catalog (48 items total: 26 PDF, 12 Images, 10 Other Documents)
const INITIAL_EVIDENCE_RECORDS = [
  // --- ASSET-DRN-006: Mithi River Sluice Gate (Primary Display from Reference) ---
  {
    id: 'EVD-DRN-001',
    title: 'Inspection Report – Sluice Gate (Feb 2024)',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-02-19',
    year: '2024',
    size: '2.8 MB',
    sizeBytes: 2936012,
    pages: 12,
    filename: 'Inspection_Report_Feb2024.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: aayamHeroLandscape,
    author: 'Brihanmumbai Municipal Corporation (BMC) Stormwater Drainage Dept',
    status: 'Verified Official',
  },
  {
    id: 'EVD-DRN-002',
    title: 'Structural Assessment – Gate Mechanism',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Technical Report',
    date: '2023-11-28',
    year: '2023',
    size: '4.1 MB',
    sizeBytes: 4299161,
    pages: 16,
    filename: 'Structural_Assessment_Gate_Mechanism.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: '/api/media/mithi_sluice_flap_gate.svg',
    author: 'IIT Bombay Marine Structures Consultancy',
    status: 'Verified Official',
  },
  {
    id: 'EVD-DRN-003',
    title: 'Gate Assembly – Site Photograph',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2023-11-20',
    year: '2023',
    size: '1.2 MB',
    sizeBytes: 1258291,
    pages: 1,
    filename: 'Gate_Assembly_Site_Photograph.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: aayamHeroLandscape,
    author: 'Er. M. Joshi (BMC Stormwater Drainage)',
    status: 'Field Submitted',
  },
  {
    id: 'EVD-DRN-004',
    title: 'Maintenance & Remediation Plan',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Intervention Document',
    date: '2023-10-15',
    year: '2023',
    size: '1.9 MB',
    sizeBytes: 1992294,
    pages: 8,
    filename: 'Maintenance_Remediation_Plan_2023.pdf',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: '/api/media/mithi_sluice_flap_gate.svg',
    author: 'Maharashtra Coastal Zone Management Authority',
    status: 'Verified Official',
  },
  {
    id: 'EVD-DRN-005',
    title: 'Corrosion Observation – Flap Joint',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Defect Evidence',
    date: '2023-10-02',
    year: '2023',
    size: '894 KB',
    sizeBytes: 915456,
    pages: 1,
    filename: 'Corrosion_Observation_Flap_Joint.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: '/api/media/mithi_sluice_flap_gate.svg',
    author: 'Commercial Diving Inspection Team',
    status: 'Verified Official',
  },
  {
    id: 'EVD-DRN-006',
    title: 'Tidal Flap Gate Hydraulic Flow Telemetry',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-01-18',
    year: '2024',
    size: '760 KB',
    sizeBytes: 778240,
    pages: 4,
    filename: 'Tidal_Gate_Hydraulic_Telemetry.csv',
    actualSourceDoc: 'Mithi_River_Sluice_Gate_Inspection_2024.txt',
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: '/api/media/mithi_sluice_flap_gate.svg',
    author: 'BMC SCADA Operations Cell',
    status: 'Verified Official',
  },

  // --- ASSET-BRG-001: Mandovi River Estuary Bridge ---
  {
    id: 'EVD-BRG-001',
    title: 'Mandovi Bridge Pier Scour Audit 2023',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2023-11-14',
    year: '2023',
    size: '3.4 MB',
    sizeBytes: 3565158,
    pages: 14,
    filename: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: mandoviBridgeThumbnail,
    author: 'Goa PWD Marine Structures Cell',
    status: 'Verified Official',
  },
  {
    id: 'EVD-BRG-002',
    title: 'Underwater Sonar Bathymetry Profile',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Technical Report',
    date: '2023-11-10',
    year: '2023',
    size: '5.2 MB',
    sizeBytes: 5452595,
    pages: 18,
    filename: 'Mandovi_Sonar_Bathymetry_Profile.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: '/api/media/mandovi_pier_scour_sonar.svg',
    author: 'National Hydrographic Office & Goa PWD',
    status: 'Verified Official',
  },
  {
    id: 'EVD-BRG-003',
    title: 'Pier 4 & 5 Foundation Photogrammetry',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2023-10-25',
    year: '2023',
    size: '2.1 MB',
    sizeBytes: 2202009,
    pages: 1,
    filename: 'Mandovi_Pier_Foundation_Photo.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: mandoviBridgeThumbnail,
    author: 'Goa Drone Mapping Unit',
    status: 'Verified Official',
  },
  {
    id: 'EVD-BRG-004',
    title: 'Expansion Joint EJ-4 Degradation Survey',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Defect Evidence',
    date: '2023-10-12',
    year: '2023',
    size: '1.8 MB',
    sizeBytes: 1887436,
    pages: 1,
    filename: 'Expansion_Joint_EJ4_Survey.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: '/api/media/mandovi_expansion_joint.svg',
    author: 'National NDT Inspection Agency',
    status: 'Verified Official',
  },
  {
    id: 'EVD-BRG-005',
    title: 'IRC:SP:35 Substructure Guidelines Reference',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Compliance Audit',
    date: '2022-06-15',
    year: '2022',
    size: '4.6 MB',
    sizeBytes: 4823449,
    pages: 32,
    filename: 'IRC_SP_35_Substructure_Guidelines.pdf',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: mandoviBridgeThumbnail,
    author: 'Indian Roads Congress (IRC)',
    status: 'Verified Official',
  },
  {
    id: 'EVD-BRG-006',
    title: 'Tendon Ultrasonic Testing Acoustic Records',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2023-09-18',
    year: '2023',
    size: '820 KB',
    sizeBytes: 839680,
    pages: 6,
    filename: 'Tendon_Ultrasonic_Acoustic_Log.dat',
    actualSourceDoc: 'Mandovi_Bridge_Pier_Scour_Audit_2023.pdf',
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: '/api/media/mandovi_pier_scour_sonar.svg',
    author: 'Advanced NDT Services Goa',
    status: 'Verified Official',
  },

  // --- ASSET-FLY-008: Kashmere Gate ISBT Multimodal Flyover ---
  {
    id: 'EVD-FLY-001',
    title: 'ISBT Flyover Ramp B Condition Evaluation',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-01-30',
    year: '2024',
    size: '3.1 MB',
    sizeBytes: 3250585,
    pages: 10,
    filename: 'DDA_Flyover_Inspection_RampB_2024.txt',
    actualSourceDoc: 'DDA_Flyover_Inspection_RampB_2024.txt',
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    thumbnail: '/api/media/kashmere_gate_flyover.svg',
    author: 'Delhi Development Authority & Central PWD',
    status: 'Verified Official',
  },
  {
    id: 'EVD-FLY-002',
    title: 'Pier P-12 Bearing Pad Extrusion Survey',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Defect Evidence',
    date: '2024-01-25',
    year: '2024',
    size: '1.4 MB',
    sizeBytes: 1468006,
    pages: 1,
    filename: 'Pier_P12_Bearing_Pad_Photo.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    thumbnail: '/api/media/kashmere_gate_flyover.svg',
    author: 'Delhi PWD Flyover Division',
    status: 'Verified Official',
  },
  {
    id: 'EVD-FLY-003',
    title: 'Transit Vibration Velocity Spectrum Log',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-01-20',
    year: '2024',
    size: '680 KB',
    sizeBytes: 696320,
    pages: 2,
    filename: 'Flyover_Vibration_Velocity_Spectrum.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    thumbnail: '/api/media/kashmere_gate_flyover.svg',
    author: 'CRRI Structural Dynamics Group',
    status: 'Verified Official',
  },
  {
    id: 'EVD-FLY-004',
    title: 'Hydraulic Jacking Shoring Feasibility Study',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Technical Report',
    date: '2024-01-10',
    year: '2024',
    size: '2.7 MB',
    sizeBytes: 2831155,
    pages: 12,
    filename: 'Flyover_Hydraulic_Jacking_Feasibility.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    thumbnail: '/api/media/kashmere_gate_flyover.svg',
    author: 'Central Road Research Institute (CRRI)',
    status: 'Verified Official',
  },

  // --- ASSET-WTP-002: Chambal Bulk Water Treatment ---
  {
    id: 'EVD-WTP-001',
    title: 'Chambal WTP Pump Vibration Assessment',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-03-02',
    year: '2024',
    size: '2.4 MB',
    sizeBytes: 2516582,
    pages: 8,
    filename: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    thumbnail: '/api/media/chambal_clarifier_unit3.svg',
    author: 'RUIDP Kota Mechanical Wing',
    status: 'Verified Official',
  },
  {
    id: 'EVD-WTP-002',
    title: 'Clarifier Unit 3 Drive Mechanical Audit',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Technical Report',
    date: '2024-02-20',
    year: '2024',
    size: '3.8 MB',
    sizeBytes: 3984588,
    pages: 14,
    filename: 'Clarifier_Unit3_Mechanical_Audit.pdf',
    actualSourceDoc: 'Chambal_WTP_Pump_Vibration_Report_2024.txt',
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    thumbnail: '/api/media/chambal_clarifier_unit3.svg',
    author: 'Kota Water Works Engineering Wing',
    status: 'Verified Official',
  },
  {
    id: 'EVD-WTP-003',
    title: 'High-Lift Motor #3 Radial Velocity Telemetry',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-02-15',
    year: '2024',
    size: '1.1 MB',
    sizeBytes: 1153433,
    pages: 3,
    filename: 'Pump_Motor_Radial_Velocity_Log.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    thumbnail: '/api/media/chambal_pump_vibration.svg',
    author: 'SCADA Plant Telemetry System',
    status: 'Verified Official',
  },
  {
    id: 'EVD-WTP-004',
    title: 'Clarifier Sludge Scraper Photographic Log',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2024-02-05',
    year: '2024',
    size: '1.6 MB',
    sizeBytes: 1677721,
    pages: 1,
    filename: 'Clarifier_Sludge_Scraper_Photo.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    thumbnail: '/api/media/chambal_clarifier_unit3.svg',
    author: 'Plant Superintendent R. Sharma',
    status: 'Verified Official',
  },

  // --- ASSET-HWY-003: Western Ghats Culvert ---
  {
    id: 'EVD-HWY-001',
    title: 'Western Ghats Culvert Km 142/6 Hydrology Report',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-05-18',
    year: '2024',
    size: '2.6 MB',
    sizeBytes: 2726297,
    pages: 9,
    filename: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    actualSourceDoc: 'Western_Ghats_Culvert_Hydrology_2024.txt',
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    thumbnail: '/api/media/western_ghats_culvert.svg',
    author: 'Kerala State Disaster Management Authority',
    status: 'Verified Official',
  },
  {
    id: 'EVD-HWY-002',
    title: 'Upstream Wingwall Shear Crack Documentation',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Defect Evidence',
    date: '2024-05-12',
    year: '2024',
    size: '1.3 MB',
    sizeBytes: 1363148,
    pages: 1,
    filename: 'Upstream_Wingwall_Shear_Crack.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    thumbnail: '/api/media/western_ghats_silt_block.svg',
    author: 'Kerala PWD NH Division',
    status: 'Verified Official',
  },
  {
    id: 'EVD-HWY-003',
    title: 'Culvert Barrel Silt Deposition Profile',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Technical Report',
    date: '2024-05-02',
    year: '2024',
    size: '1.7 MB',
    sizeBytes: 1782579,
    pages: 6,
    filename: 'Culvert_Barrel_Silt_Deposition_Profile.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    thumbnail: '/api/media/western_ghats_culvert.svg',
    author: 'Idukki Road Safety Cell',
    status: 'Verified Official',
  },

  // --- ASSET-CNL-004: Krishna Delta Canal Lock Gate ---
  {
    id: 'EVD-CNL-001',
    title: 'Lock Gate #12 Post-Overhaul Certificate',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Compliance Audit',
    date: '2024-08-14',
    year: '2024',
    size: '1.8 MB',
    sizeBytes: 1887436,
    pages: 4,
    filename: 'Field Verification Certificate #AP-WRD-2024-441',
    actualSourceDoc: 'Unindexed_General_Catchment_Memo_2024.txt',
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    thumbnail: '/api/media/krishna_canal_lock12.svg',
    author: 'Andhra Pradesh Water Resources Department',
    status: 'Verified Official',
  },
  {
    id: 'EVD-CNL-002',
    title: 'Hydraulic Winch Seal Hydrostatic Test Record',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-08-12',
    year: '2024',
    size: '950 KB',
    sizeBytes: 972800,
    pages: 2,
    filename: 'Lock_Gate_Hydrostatic_Test_Record.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    thumbnail: '/api/media/krishna_canal_lock12.svg',
    author: 'AP Water Resources Field Audit Unit',
    status: 'Verified Official',
  },
  {
    id: 'EVD-CNL-003',
    title: 'Lock Gate 12 Pre-Monsoon Operability Image',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2024-08-01',
    year: '2024',
    size: '2.2 MB',
    sizeBytes: 2306867,
    pages: 1,
    filename: 'Lock_Gate_12_Operability_Photo.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    thumbnail: '/api/media/krishna_canal_lock12.svg',
    author: 'Assistant Executive Engineer V. Rao',
    status: 'Verified Official',
  },

  // --- ASSET-SUB-005: Peenya 220kV Substation ---
  {
    id: 'EVD-SUB-001',
    title: 'Peenya 220kV Grid Substation Annual Audit',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-09-01',
    year: '2024',
    size: '4.3 MB',
    sizeBytes: 4508876,
    pages: 18,
    filename: 'Peenya_Substation_Annual_Audit_2024.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    thumbnail: '/api/media/peenya_substation_yard.svg',
    author: 'KPTCL Grid Operations',
    status: 'Verified Official',
  },
  {
    id: 'EVD-SUB-002',
    title: 'Transformer Bay Dissolved Gas Telemetry',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-08-20',
    year: '2024',
    size: '1.2 MB',
    sizeBytes: 1258291,
    pages: 5,
    filename: 'Transformer_DGA_Telemetry_Log.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    thumbnail: '/api/media/peenya_substation_yard.svg',
    author: 'KPTCL Substation Diagnostic Lab',
    status: 'Verified Official',
  },
  {
    id: 'EVD-SUB-003',
    title: 'Switchyard Circuit Breaker Diagnostic Image',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2024-08-15',
    year: '2024',
    size: '1.9 MB',
    sizeBytes: 1992294,
    pages: 1,
    filename: 'Switchyard_Circuit_Breaker_Photo.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    thumbnail: '/api/media/peenya_substation_yard.svg',
    author: 'Authorized Substation Engineer',
    status: 'Verified Official',
  },

  // --- ASSET-HLT-007: Rural Community Health Center ---
  {
    id: 'EVD-HLT-001',
    title: 'Sonbhadra Cold Chain Facility Audit Report',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-07-22',
    year: '2024',
    size: '2.1 MB',
    sizeBytes: 2202009,
    pages: 8,
    filename: 'Sonbhadra_Health_Cold_Chain_Audit.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-HLT-007',
    assetName: 'Rural Community Health Center & Cold Chain Block',
    thumbnail: '/api/media/sonbhadra_health_block.svg',
    author: 'UP National Health Mission Directorate',
    status: 'Verified Official',
  },
  {
    id: 'EVD-HLT-002',
    title: 'Solar Inverter Backup Battery Telemetry',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-07-15',
    year: '2024',
    size: '740 KB',
    sizeBytes: 757760,
    pages: 2,
    filename: 'Solar_Battery_Backup_Telemetry.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-HLT-007',
    assetName: 'Rural Community Health Center & Cold Chain Block',
    thumbnail: '/api/media/sonbhadra_health_block.svg',
    author: 'State Renewable Energy Development Agency',
    status: 'Verified Official',
  },
  {
    id: 'EVD-HLT-003',
    title: 'Rooftop Rainwater Harvesting Inspection Photo',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2024-07-10',
    year: '2024',
    size: '1.5 MB',
    sizeBytes: 1572864,
    pages: 1,
    filename: 'Rooftop_Rainwater_Harvesting_Photo.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-HLT-007',
    assetName: 'Rural Community Health Center & Cold Chain Block',
    thumbnail: '/api/media/sonbhadra_health_block.svg',
    author: 'District Civil Surgeon Office',
    status: 'Verified Official',
  },

  // Additional realistic repository documents to reach full multi-year registry (48 items)
  {
    id: 'EVD-REG-001',
    title: 'National Disaster Management Guidelines for Bridges',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Compliance Audit',
    date: '2022-10-18',
    year: '2022',
    size: '5.8 MB',
    sizeBytes: 6081740,
    pages: 42,
    filename: 'NDMA_Bridge_Disaster_Safety_2022.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: mandoviBridgeThumbnail,
    author: 'National Disaster Management Authority (NDMA)',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-002',
    title: 'State River Basin Dredging Protocol Directive',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Compliance Audit',
    date: '2024-01-10',
    year: '2024',
    size: '3.6 MB',
    sizeBytes: 3774873,
    pages: 15,
    filename: 'Unindexed_General_Catchment_Memo_2024.txt',
    actualSourceDoc: 'Unindexed_General_Catchment_Memo_2024.txt',
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: aayamHeroLandscape,
    author: 'Central Water Commission (CWC)',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-003',
    title: 'Urban Flood Barrier Environmental Impact Audit',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Technical Report',
    date: '2023-08-14',
    year: '2023',
    size: '3.2 MB',
    sizeBytes: 3355443,
    pages: 20,
    filename: 'Urban_Flood_Barrier_Environmental_Audit.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: aayamHeroLandscape,
    author: 'Maharashtra State Pollution Control Board',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-004',
    title: 'Sluice Intake Channel Silt Core Boring Log',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Technical Report',
    date: '2023-09-05',
    year: '2023',
    size: '1.4 MB',
    sizeBytes: 1468006,
    pages: 7,
    filename: 'Sluice_Intake_Channel_Boring_Log.txt',
    actualSourceDoc: null,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: '/api/media/mithi_sluice_flap_gate.svg',
    author: 'Geotechnical Investigation Cell Mumbai',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-005',
    title: 'Mandovi Bridge Navigation Clearance Verification',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2023-07-29',
    year: '2023',
    size: '2.5 MB',
    sizeBytes: 2621440,
    pages: 11,
    filename: 'Mandovi_Navigation_Clearance_Audit.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: mandoviBridgeThumbnail,
    author: 'Inland Waterways Authority of India',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-006',
    title: 'Estuary Salinity and Cathodic Protection Analysis',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Technical Report',
    date: '2023-06-18',
    year: '2023',
    size: '4.8 MB',
    sizeBytes: 5033164,
    pages: 24,
    filename: 'Estuary_Salinity_Cathodic_Protection.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: mandoviBridgeThumbnail,
    author: 'National Institute of Oceanography (NIO)',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-007',
    title: 'High-Lift Impeller Metallurgical Ultrasonic Scan',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Technical Report',
    date: '2024-02-28',
    year: '2024',
    size: '980 KB',
    sizeBytes: 1003520,
    pages: 4,
    filename: 'Impeller_Metallurgical_Scan.dat',
    actualSourceDoc: null,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    thumbnail: '/api/media/chambal_pump_vibration.svg',
    author: 'Metallurgical Inspection Laboratory Jaipur',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-008',
    title: 'Water Filtration Media Sieve Analysis Chart',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Technical Report',
    date: '2024-01-28',
    year: '2024',
    size: '850 KB',
    sizeBytes: 870400,
    pages: 3,
    filename: 'Filter_Media_Sieve_Analysis.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-WTP-002',
    assetName: 'Chambal Bulk Water Treatment & Clarifier Unit 3',
    thumbnail: '/api/media/chambal_clarifier_unit3.svg',
    author: 'RUIDP Water Quality Division',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-009',
    title: 'Culvert Torrential Runoff Velocity Hydrograph',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-05-15',
    year: '2024',
    size: '910 KB',
    sizeBytes: 931840,
    pages: 3,
    filename: 'Culvert_Runoff_Hydrograph_2024.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-HWY-003',
    assetName: 'Western Ghats Ghat-Road Culvert Km 142/6',
    thumbnail: '/api/media/western_ghats_culvert.svg',
    author: 'Kerala Water Resources Hydrology Division',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-010',
    title: 'Flyover Seismic Restrainer Block Audit',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-01-18',
    year: '2024',
    size: '2.9 MB',
    sizeBytes: 3040870,
    pages: 11,
    filename: 'Flyover_Seismic_Restrainer_Audit.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-FLY-008',
    assetName: 'Kashmere Gate ISBT Multimodal Flyover Ramp B',
    thumbnail: '/api/media/kashmere_gate_flyover.svg',
    author: 'Delhi PWD Bridge & Flyover Cell',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-011',
    title: 'Canal Lock Gate Electrical Actuator Inspection',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Inspection Report',
    date: '2024-07-20',
    year: '2024',
    size: '1.9 MB',
    sizeBytes: 1992294,
    pages: 7,
    filename: 'Canal_Actuator_Inspection_2024.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-CNL-004',
    assetName: 'Krishna Western Delta Main Canal Lock Gate 12',
    thumbnail: '/api/media/krishna_canal_lock12.svg',
    author: 'AP Electrical Inspectorate',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-012',
    title: 'Substation SF6 Gas Density & Leakage Certificate',
    type: 'PDF Report',
    rawType: 'pdf',
    category: 'Compliance Audit',
    date: '2024-08-25',
    year: '2024',
    size: '1.6 MB',
    sizeBytes: 1677721,
    pages: 6,
    filename: 'Substation_SF6_Gas_Density_Cert.pdf',
    actualSourceDoc: null,
    assetId: 'ASSET-SUB-005',
    assetName: 'Peenya 220kV Extra High Voltage Power Substation',
    thumbnail: '/api/media/peenya_substation_yard.svg',
    author: 'Central Electricity Authority (CEA)',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-013',
    title: 'Vaccine Cold Storage Temperature SCADA Archive',
    type: 'Other Documents',
    rawType: 'other',
    category: 'Sensor Log',
    date: '2024-07-01',
    year: '2024',
    size: '1.3 MB',
    sizeBytes: 1363148,
    pages: 8,
    filename: 'Cold_Storage_Temperature_SCADA.csv',
    actualSourceDoc: null,
    assetId: 'ASSET-HLT-007',
    assetName: 'Rural Community Health Center & Cold Chain Block',
    thumbnail: '/api/media/sonbhadra_health_block.svg',
    author: 'WHO India Public Health Surveillance',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-014',
    title: 'Mithi River Catchment Drone Orthophoto Mosaic',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2023-12-05',
    year: '2023',
    size: '4.5 MB',
    sizeBytes: 4718592,
    pages: 1,
    filename: 'Mithi_Catchment_Drone_Mosaic.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-DRN-006',
    assetName: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    thumbnail: aayamHeroLandscape,
    author: 'Maharashtra Remote Sensing Application Centre',
    status: 'Verified Official',
  },
  {
    id: 'EVD-REG-015',
    title: 'Mandovi Pier 4 Heavy Armor Rock Rip-Rap Completion',
    type: 'Images & Photos',
    rawType: 'image',
    category: 'Site Image',
    date: '2024-01-28',
    year: '2024',
    size: '2.8 MB',
    sizeBytes: 2936012,
    pages: 1,
    filename: 'Mandovi_Pier4_RipRap_Completion.jpg',
    actualSourceDoc: null,
    assetId: 'ASSET-BRG-001',
    assetName: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    thumbnail: mandoviBridgeThumbnail,
    author: 'Goa PWD Engineering Wing',
    status: 'Verified Official',
  },
];

export default function EvidenceLibraryPage({
  assets = [],
  selectedAsset = null,
  onOpenProfile,
  onNavigate,
  isDemo = false,
}) {
  const { t } = useLanguage();

  // Active asset determination (default to Mithi Sluice Gate or first asset)
  const [activeAssetId, setActiveAssetId] = useState(
    selectedAsset?.id ||
    assets.find((a) => a.id === 'ASSET-DRN-006')?.id ||
    assets[0]?.id ||
    'ASSET-DRN-006'
  );

  const activeAsset =
    assets.find((a) => a.id === activeAssetId) ||
    selectedAsset ||
    assets.find((a) => a.id === 'ASSET-DRN-006') ||
    assets[0] ||
    null;

  // Asset dropdown state
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Evidence records state
  const [evidenceRecords, setEvidenceRecords] = useState(INITIAL_EVIDENCE_RECORDS);
  const [selectedRecordId, setSelectedRecordId] = useState(INITIAL_EVIDENCE_RECORDS[0].id);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [dateFilter, setDateFilter] = useState('All Dates');
  const [sortBy, setSortBy] = useState('latest');

  // Pagination state (5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Viewer / Preview state
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewPage, setPreviewPage] = useState(1);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [modalDocName, setModalDocName] = useState(null);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('PDF Report');
  const [uploadCategory, setUploadCategory] = useState('Inspection Report');
  const [uploadTargetAsset, setUploadTargetAsset] = useState(activeAsset?.id || 'ASSET-DRN-006');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);

  // Row Action Menu State
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  // Sync external selectedAsset prop
  useEffect(() => {
    if (selectedAsset?.id) {
      setActiveAssetId(selectedAsset.id);
    }
  }, [selectedAsset]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAssetDropdownOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActiveActionMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    return evidenceRecords.filter((doc) => {
      // 1. Asset Filter: If an asset is specifically chosen from the header
      if (activeAssetId && activeAssetId !== 'ALL' && doc.assetId !== activeAssetId) {
        return false;
      }
      // 2. Type Filter
      if (typeFilter !== 'All Types') {
        if (typeFilter === 'PDF Reports' && doc.type !== 'PDF Report') return false;
        if (typeFilter === 'Images & Photos' && doc.type !== 'Images & Photos') return false;
        if (typeFilter === 'Other Documents' && doc.type !== 'Other Documents') return false;
      }
      // 3. Category Filter
      if (categoryFilter !== 'All Categories' && doc.category !== categoryFilter) {
        return false;
      }
      // 4. Date Filter
      if (dateFilter !== 'All Dates' && doc.year !== dateFilter) {
        return false;
      }
      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          doc.title.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q) ||
          doc.type.toLowerCase().includes(q) ||
          (doc.author && doc.author.toLowerCase().includes(q)) ||
          doc.filename.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'latest') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.sizeBytes - a.sizeBytes;
      return 0;
    });
  }, [evidenceRecords, activeAssetId, typeFilter, categoryFilter, dateFilter, searchQuery, sortBy]);

  // Selected Record Object
  const selectedRecord = useMemo(() => {
    const found = filteredRecords.find((r) => r.id === selectedRecordId);
    return found || filteredRecords[0] || evidenceRecords[0];
  }, [filteredRecords, selectedRecordId, evidenceRecords]);

  // Update selected record when filter changes if previous is not in view
  useEffect(() => {
    if (filteredRecords.length > 0 && !filteredRecords.some((r) => r.id === selectedRecordId)) {
      setSelectedRecordId(filteredRecords[0].id);
    }
    setCurrentPage(1);
  }, [activeAssetId, typeFilter, categoryFilter, dateFilter, searchQuery]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Handle asset switch
  const handleSelectAsset = (assetOrAll) => {
    if (assetOrAll === 'ALL') {
      setActiveAssetId('ALL');
    } else {
      setActiveAssetId(assetOrAll.id);
    }
    setIsAssetDropdownOpen(false);
  };

  // Open full screen modal
  const handleOpenDoc = (filename) => {
    setModalDocName(filename);
    setIsViewerModalOpen(true);
  };

  // Handle Download File
  const handleDownloadFile = (record) => {
    const element = document.createElement('a');
    const content = `AAYAM INFRASTRUCTURE INTELLIGENCE - VERIFIED EVIDENCE ARCHIVE\n\nTitle: ${record.title}\nCategory: ${record.category}\nType: ${record.type}\nAsset: ${record.assetName} (${record.assetId})\nDate: ${record.date}\nAuthor: ${record.author}\nStatus: ${record.status}\n\n[Official engineering citation and telemetry verified by AAYAM Intelligence Platform]`;
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = record.filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Handle New Evidence Upload Submission
  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    const newRecord = {
      id: `EVD-NEW-${Date.now().toString().slice(-4)}`,
      title: uploadTitle.trim(),
      type: uploadType,
      rawType: uploadType === 'PDF Report' ? 'pdf' : uploadType === 'Images & Photos' ? 'image' : 'other',
      category: uploadCategory,
      date: new Date().toISOString().split('T')[0],
      year: new Date().getFullYear().toString(),
      size: uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB',
      sizeBytes: uploadFile ? uploadFile.size : 1887436,
      pages: 6,
      filename: uploadFile ? uploadFile.name : `${uploadTitle.replace(/\s+/g, '_')}.pdf`,
      actualSourceDoc: null,
      assetId: uploadTargetAsset,
      assetName: assets.find((a) => a.id === uploadTargetAsset)?.name || 'Infrastructure Asset',
      thumbnail: uploadType === 'Images & Photos' ? aayamHeroLandscape : mandoviBridgeThumbnail,
      author: 'Authorized Engineering Field Officer',
      status: 'Field Submitted',
    };

    setEvidenceRecords([newRecord, ...evidenceRecords]);
    setSelectedRecordId(newRecord.id);
    setUploadSuccessMsg(`Evidence "${newRecord.title}" uploaded successfully.`);
    setTimeout(() => {
      setIsUploadModalOpen(false);
      setUploadSuccessMsg(null);
      setUploadTitle('');
      setUploadFile(null);
    }, 1200);
  };

  // Summary Counts (Matching reference: 48 Total, 26 PDF, 12 Images, 10 Other)
  const totalEvidenceCount = evidenceRecords.length;
  const pdfReportsCount = evidenceRecords.filter((d) => d.type === 'PDF Report').length;
  const imagesPhotosCount = evidenceRecords.filter((d) => d.type === 'Images & Photos').length;
  const otherDocumentsCount = evidenceRecords.filter((d) => d.type === 'Other Documents').length;

  return (
    <div className="space-y-5 animate-fadeIn max-w-[1600px] mx-auto pb-8">
      {/* =========================================================================
          PAGE HEADER: Title + Subtitle on Left, Asset Selector on Right
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Green Folder Icon + Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Folder className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {t('evidence.title', 'Evidence Library')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t(
                'evidence.subtitle',
                'Inspection reports, technical documents, images and other evidence linked to infrastructure assets.'
              )}
            </p>
          </div>
        </div>

        {/* Right: Select Asset Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div className="text-[11px] font-semibold text-slate-400 mb-1 text-right hidden sm:block">
            {t('inspections.selectAsset', 'Select Asset')}
          </div>
          <button
            type="button"
            onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
            className="flex items-center gap-3 bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl px-3 py-2 shadow-xs transition-all cursor-pointer text-left w-full sm:w-auto"
          >
            <div className="w-10 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
              <img
                src={getAssetImage(activeAsset)}
                alt={activeAsset?.name || 'All Monitored Assets'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = mandoviBridgeThumbnail;
                }}
              />
            </div>
            <div className="min-w-0 pr-1 max-w-[200px] sm:max-w-[240px]">
              <p className="text-xs font-bold text-slate-900 truncate">
                {activeAssetId === 'ALL'
                  ? 'All Monitored Assets'
                  : activeAsset?.name || 'Mithi River Stormwater Tidal Outfall Sluice Gate'}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                {activeAssetId === 'ALL' ? 'PORTFOLIO-ALL' : activeAsset?.id || 'ASSET-DRN-006'}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                isAssetDropdownOpen ? 'rotate-180 text-emerald-700' : ''
              }`}
            />
          </button>

          {/* Asset Dropdown Menu */}
          {isAssetDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Registered Infrastructure
              </div>
              <button
                onClick={() => handleSelectAsset('ALL')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                  activeAssetId === 'ALL' ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-800'
                }`}
              >
                <div className="w-9 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 flex items-center justify-center text-emerald-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">All Monitored Assets</p>
                  <p className="text-[10px] font-mono text-slate-500">Complete Repository (48 Records)</p>
                </div>
                {activeAssetId === 'ALL' && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
              </button>

              {assets.map((a) => {
                const isCur = a.id === activeAssetId;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAsset(a)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                      isCur ? 'bg-emerald-50/60 font-semibold text-emerald-900' : 'text-slate-800'
                    }`}
                  >
                    <div className="w-9 h-7 rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                      <img
                        src={getAssetImage(a)}
                        alt={a.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = mandoviBridgeThumbnail;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{a.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">{a.id}</p>
                    </div>
                    {isCur && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: 4 SUMMARY CARDS IN A SINGLE HORIZONTAL ROW
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Evidence */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/60">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {totalEvidenceCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('evidence.kpiTotal', 'Total Evidence')}
            </div>
          </div>
        </div>

        {/* Card 2: PDF Reports */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/60">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {pdfReportsCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('evidence.kpiPdf', 'PDF Reports')}
            </div>
          </div>
        </div>

        {/* Card 3: Images & Photos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/60">
            <ImageIcon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {imagesPhotosCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('evidence.kpiImages', 'Images & Photos')}
            </div>
          </div>
        </div>

        {/* Card 4: Other Documents */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100/60">
            <File className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {otherDocumentsCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-1">
              {t('evidence.kpiOther', 'Other Documents')}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: SEARCH AND FILTERS HORIZONTAL TOOLBAR
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs flex flex-wrap lg:flex-nowrap items-center gap-3">
        {/* Search Field */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('evidence.searchPlaceholder', 'Search evidence by title or keyword...')}
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-xs text-slate-800 placeholder-slate-400 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown 1: All Types */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-700 font-medium cursor-pointer">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-4 appearance-none"
            >
              <option value="All Types">All Types</option>
              <option value="PDF Reports">PDF Reports</option>
              <option value="Images & Photos">Images & Photos</option>
              <option value="Other Documents">Other Documents</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Dropdown 2: All Categories */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-700 font-medium cursor-pointer">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-4 appearance-none"
            >
              <option value="All Categories">All Categories</option>
              <option value="Inspection Report">Inspection Report</option>
              <option value="Technical Report">Technical Report</option>
              <option value="Site Image">Site Image</option>
              <option value="Intervention Document">Intervention Document</option>
              <option value="Defect Evidence">Defect Evidence</option>
              <option value="Compliance Audit">Compliance Audit</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Dropdown 3: All Dates */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs text-slate-700 font-medium cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-4 appearance-none"
            >
              <option value="All Dates">All Dates</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Upload Evidence Button */}
        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t('evidence.uploadButton', 'Upload Evidence')}</span>
        </button>
      </div>

      {/* =========================================================================
          MAIN CONTENT: TWO-COLUMN LAYOUT (~44% LEFT, ~56% RIGHT)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =========================================================================
            LEFT COLUMN: EVIDENCE RECORDS (44% on desktop -> lg:col-span-5)
            ========================================================================= */}
        <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header: Title + Total Count + Sort Selector */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
                  <FileText className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Evidence Records ({filteredRecords.length})
                </h2>
              </div>

              {/* Sort Selector */}
              <div className="relative text-xs">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold text-emerald-700 bg-transparent focus:outline-none cursor-pointer pr-4 appearance-none"
                >
                  <option value="latest">Sort: Latest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="title">Sort: Title (A-Z)</option>
                  <option value="size">Sort: Size (Largest)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700 pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* List of Evidence Rows */}
            <div className="space-y-2.5 mt-4">
              {paginatedRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No matching evidence records</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search query or filters.</p>
                </div>
              ) : (
                paginatedRecords.map((item) => {
                  const isSelected = item.id === selectedRecord.id;
                  const isPdf = item.type === 'PDF Report';
                  const isImage = item.type === 'Images & Photos';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRecordId(item.id)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer relative group ${
                        isSelected
                          ? 'bg-emerald-50/40 border-emerald-500 ring-1 ring-emerald-500/20 shadow-2xs'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Left: Type Badge + Thumbnail + Details */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Type Icon Badge */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isPdf
                              ? 'bg-red-50 text-red-600 border-red-100'
                              : isImage
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-sky-50 text-sky-600 border-sky-100'
                          }`}
                        >
                          {isPdf ? (
                            <FileText className="w-3.5 h-3.5" />
                          ) : isImage ? (
                            <ImageIcon className="w-3.5 h-3.5" />
                          ) : (
                            <File className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-14 h-11 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 shadow-2xs">
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = mandoviBridgeThumbnail;
                            }}
                          />
                        </div>

                        {/* Title & Metadata Line */}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                            {item.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>{item.category}</span>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1 font-mono text-slate-500">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{item.date}</span>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1 font-mono text-slate-500">
                              <Database className="w-3 h-3 text-slate-400" />
                              <span>{item.size}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Three-dot Action Menu */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="More actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Popup Context Menu */}
                        {activeActionMenuId === item.id && (
                          <div
                            ref={actionMenuRef}
                            className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecordId(item.id);
                                setActiveActionMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>Preview Evidence</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDoc(item.actualSourceDoc || item.filename);
                                setActiveActionMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Inspect Full Screen</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(item);
                                setActiveActionMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-400" />
                              <span>Download Document</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination Controls at Bottom */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} –{' '}
              {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1;
                const isAct = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isAct
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && (
                <>
                  <span className="text-slate-400 px-0.5">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === totalPages
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: EVIDENCE PREVIEW (56% on desktop -> lg:col-span-7)
            ========================================================================= */}
        <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header: Title + Fullscreen expand button */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
                  <FileText className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {t('evidence.previewTitle', 'Evidence Preview')}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => handleOpenDoc(selectedRecord.actualSourceDoc || selectedRecord.filename)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Open full screen reader"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Embedded Document Viewer Container */}
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-300/80 bg-slate-900 shadow-xs">
              {/* Dark Charcoal Top Toolbar */}
              <div className="bg-[#2D3748] px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-200 border-b border-slate-700 text-xs">
                {/* Document Filename */}
                <div className="font-mono text-slate-300 font-medium truncate max-w-[200px] sm:max-w-[260px]">
                  {selectedRecord.filename}
                </div>

                {/* Page Indicator & Zoom Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                    <span>{previewPage}</span>
                    <span className="text-slate-500">/</span>
                    <span>{selectedRecord.pages || 12}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300 border-l border-slate-600 pl-3">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                      className="p-0.5 hover:text-white"
                      title="Zoom out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono w-10 text-center">{previewZoom}%</span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.min(180, z + 10))}
                      className="p-0.5 hover:text-white"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-2 border-l border-slate-600 pl-3">
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(selectedRecord)}
                    className="p-1 hover:text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1 hover:text-white transition-colors"
                    title="Print"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Rendered Document Canvas */}
              <div className="bg-[#4A5568]/40 p-4 sm:p-6 overflow-y-auto max-h-[380px] sm:max-h-[420px] flex items-center justify-center">
                {selectedRecord.rawType === 'image' ? (
                  /* High-Resolution Photograph Preview */
                  <div className="relative rounded-xl overflow-hidden bg-white shadow-lg border border-slate-200/80 max-w-lg w-full">
                    <img
                      src={selectedRecord.thumbnail}
                      alt={selectedRecord.title}
                      className="w-full h-auto object-cover max-h-[340px]"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = mandoviBridgeThumbnail;
                      }}
                    />
                    <div className="p-3 bg-white/95 backdrop-blur-xs border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{selectedRecord.title}</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Verified Site Imagery
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Official AAYAM Inspection Report Cover Document Preview */
                  <div
                    style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'top center' }}
                    className="bg-white rounded-xl shadow-xl border border-slate-200/90 w-full max-w-md p-6 transition-transform duration-150 space-y-4"
                  >
                    {/* Official Report Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center font-black text-xs">
                          A
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-900 tracking-tight leading-none">AAYAM</p>
                          <p className="text-[8px] font-medium text-slate-400">Infrastructure Intelligence</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        OFFICIAL PUBLIC AUDIT
                      </span>
                    </div>

                    {/* Report Title & Subtitle */}
                    <div className="text-center pt-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                        Infrastructure Inspection Report
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {selectedRecord.assetName}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Ref: {selectedRecord.id} • {selectedRecord.date}
                      </p>
                    </div>

                    {/* Embedded Infrastructure Photo Inside Document Cover */}
                    <div className="rounded-xl overflow-hidden border border-slate-200/80 shadow-xs h-36 bg-slate-100">
                      <img
                        src={selectedRecord.thumbnail}
                        alt="Infrastructure Inspection Evidence"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = mandoviBridgeThumbnail;
                        }}
                      />
                    </div>

                    {/* Report Summary Data Block */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Authoring Agency:</span>
                        <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">
                          {selectedRecord.author}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Classification:</span>
                        <span className="font-medium text-slate-800">{selectedRecord.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-500">Verification Status:</span>
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Certified Audit
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Details Metadata Line */}
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                {selectedRecord.title}
              </h3>

              {/* 4 Metadata Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                {/* Type */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Type
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">{selectedRecord.type}</span>
                  </div>
                </div>

                {/* Category */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Category
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">{selectedRecord.category}</span>
                  </div>
                </div>

                {/* Size */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Size
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-xs font-bold font-mono text-slate-800 truncate">{selectedRecord.size}</span>
                  </div>
                </div>

                {/* Uploaded On */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                    Uploaded On
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-xs font-bold font-mono text-slate-800 truncate">{selectedRecord.date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons: View Full Screen & Download */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-5 mt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleOpenDoc(selectedRecord.actualSourceDoc || selectedRecord.filename)}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>View Full Screen</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadFile(selectedRecord)}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-emerald-600/40 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: FULL SCREEN EVIDENCE VIEWER MODAL (INTEGRATED)
          ========================================================================= */}
      {isViewerModalOpen && modalDocName && (
        <EvidenceViewerModal
          isOpen={isViewerModalOpen}
          onClose={() => setIsViewerModalOpen(false)}
          selectedCitationLabel={modalDocName}
          citations={[modalDocName]}
          evidence={[
            {
              citation_label: modalDocName,
              source: modalDocName,
              document_name: modalDocName,
              filename: modalDocName,
              section_title: selectedRecord?.title || 'Full Document Inspection',
              page_number: 1,
              excerpt:
                selectedRecord?.summary ||
                'Verified public engineering document from official state infrastructure records.',
              relevance_score: 100,
            },
          ]}
          onNavigate={onNavigate}
          isDemo={isDemo}
        />
      )}

      {/* =========================================================================
          MODAL: UPLOAD EVIDENCE WORKFLOW
          ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Infrastructure Evidence</h3>
                  <p className="text-xs text-slate-500">Link verified technical documents or photos to an asset</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              {uploadSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}

              {/* Target Asset */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Infrastructure Asset
                </label>
                <select
                  value={uploadTargetAsset}
                  onChange={(e) => setUploadTargetAsset(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Evidence Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document / Evidence Title
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Ultrasonic Bearing Defect Verification Report"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Type and Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="PDF Report">PDF Report</option>
                    <option value="Images & Photos">Images & Photos</option>
                    <option value="Other Documents">Other Documents</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Inspection Report">Inspection Report</option>
                    <option value="Technical Report">Technical Report</option>
                    <option value="Site Image">Site Image</option>
                    <option value="Intervention Document">Intervention Document</option>
                    <option value="Defect Evidence">Defect Evidence</option>
                    <option value="Compliance Audit">Compliance Audit</option>
                  </select>
                </div>
              </div>

              {/* File Attachment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Attachment (PDF, JPG, PNG, TXT, CSV)
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 bg-slate-50/50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Confirm Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
