/**
 * Centralized Asset Image Resolver for AAYAM Infrastructure Intelligence
 * Maps each Indian infrastructure asset to its authentic, high-resolution photography.
 */

// Hero & Bridge Photographs
import bandraWorliSeaLink4k from '../assets/bandra-worli-sea-link-4k.webp';
import bandraWorliSeaLinkJpg from '../assets/bandra-worli-sea-link-4k.jpg';
import bandraWorliThumbnail from '../assets/bandra-worli-thumbnail.jpg';
import mandoviBridgeThumbnail from '../assets/mandovi-bridge-thumbnail.jpg';
import mandoviBridgeImg from '../assets/mandovi-bridge.jpg';

// Authentic Indian Infrastructure Asset Photographs
import mithiSluiceGateImg from '../assets/mithi-sluice-gate.jpg';
import mithiSluiceGateThumb from '../assets/mithi-sluice-gate-thumb.jpg';

import kashmereGateFlyoverImg from '../assets/kashmere-gate-flyover.jpg';
import kashmereGateFlyoverThumb from '../assets/kashmere-gate-flyover-thumb.jpg';

import chambalWaterTreatmentImg from '../assets/chambal-water-treatment.jpg';
import chambalWaterTreatmentThumb from '../assets/chambal-water-treatment-thumb.jpg';

import westernGhatsCulvertImg from '../assets/western-ghats-culvert.jpg';
import westernGhatsCulvertThumb from '../assets/western-ghats-culvert-thumb.jpg';

import krishnaCanalLockImg from '../assets/krishna-canal-lock.jpg';
import krishnaCanalLockThumb from '../assets/krishna-canal-lock-thumb.jpg';

import peenyaPowerSubstationImg from '../assets/peenya-power-substation.jpg';
import peenyaPowerSubstationThumb from '../assets/peenya-power-substation-thumb.jpg';

import sonbhadraHealthCenterImg from '../assets/sonbhadra-health-center.jpg';
import sonbhadraHealthCenterThumb from '../assets/sonbhadra-health-center-thumb.jpg';

export {
  bandraWorliSeaLink4k,
  bandraWorliSeaLinkJpg,
  bandraWorliThumbnail,
  mandoviBridgeThumbnail,
  mandoviBridgeImg,
  mithiSluiceGateImg,
  mithiSluiceGateThumb,
  kashmereGateFlyoverImg,
  kashmereGateFlyoverThumb,
  chambalWaterTreatmentImg,
  chambalWaterTreatmentThumb,
  westernGhatsCulvertImg,
  westernGhatsCulvertThumb,
  krishnaCanalLockImg,
  krishnaCanalLockThumb,
  peenyaPowerSubstationImg,
  peenyaPowerSubstationThumb,
  sonbhadraHealthCenterImg,
  sonbhadraHealthCenterThumb,
};

/**
 * Returns the high-resolution, full-width infrastructure photograph for an asset.
 * Ideal for hero headers, detail preview panels, and modal cards.
 */
export function getAssetHeroImage(asset) {
  if (!asset) return bandraWorliSeaLink4k;
  const id = asset.id || '';
  const name = (asset.name || '').toLowerCase();

  // 1. Mithi River Sluice Gate (Mumbai)
  if (id === 'ASSET-DRN-006' || id === 'DEMO-DRN-006' || name.includes('mithi') || name.includes('sluice')) {
    return mithiSluiceGateImg;
  }

  // 2. Mandovi River Estuary Bridge (Goa)
  if (id === 'ASSET-BRG-001' || id === 'DEMO-BRG-001' || name.includes('mandovi')) {
    return mandoviBridgeImg || mandoviBridgeThumbnail;
  }

  // 3. Kashmere Gate ISBT Multimodal Flyover Ramp B (Delhi)
  if (id === 'ASSET-FLY-008' || name.includes('flyover') || name.includes('kashmere')) {
    return kashmereGateFlyoverImg;
  }

  // 4. Chambal Bulk Water Treatment & Clarifier Unit 3 (Kota)
  if (id === 'ASSET-WTP-002' || id === 'DEMO-WTP-002' || name.includes('chambal') || name.includes('clarifier')) {
    return chambalWaterTreatmentImg;
  }

  // 5. Western Ghats Ghat-Road Culvert Km 142/6 (Kerala)
  if (id === 'ASSET-HWY-003' || name.includes('culvert') || name.includes('western ghats')) {
    return westernGhatsCulvertImg;
  }

  // 6. Krishna Western Delta Main Canal Lock Gate 12 (Andhra Pradesh)
  if (id === 'ASSET-CNL-004' || id === 'DEMO-HWY-003' || name.includes('krishna') || name.includes('canal')) {
    return krishnaCanalLockImg;
  }

  // 7. Peenya 220kV Extra High Voltage Power Substation (Bengaluru)
  if (id === 'ASSET-SUB-005' || name.includes('peenya') || name.includes('substation')) {
    return peenyaPowerSubstationImg;
  }

  // 8. Rural Community Health Center & Cold Chain Block (Sonbhadra, UP)
  if (id === 'ASSET-HLT-007' || id === 'ASSET-PUB-007' || name.includes('health') || name.includes('sonbhadra')) {
    return sonbhadraHealthCenterImg;
  }

  if (asset.category === 'Bridge' || name.includes('bridge') || name.includes('sea link')) {
    return bandraWorliSeaLink4k;
  }

  return bandraWorliSeaLink4k;
}

/**
 * Returns the dedicated square/thumbnail crop for an asset.
 * Prevents squishing wide panoramas into small table/card thumbnails.
 */
export function getAssetThumbnail(asset) {
  if (!asset) return bandraWorliThumbnail;
  const id = asset.id || '';
  const name = (asset.name || '').toLowerCase();

  // 1. Mithi River Sluice Gate
  if (id === 'ASSET-DRN-006' || id === 'DEMO-DRN-006' || name.includes('mithi') || name.includes('sluice')) {
    return mithiSluiceGateThumb;
  }

  // 2. Mandovi River Estuary Bridge
  if (id === 'ASSET-BRG-001' || id === 'DEMO-BRG-001' || name.includes('mandovi')) {
    return mandoviBridgeThumbnail;
  }

  // 3. Kashmere Gate ISBT Flyover Ramp B
  if (id === 'ASSET-FLY-008' || name.includes('flyover') || name.includes('kashmere')) {
    return kashmereGateFlyoverThumb;
  }

  // 4. Chambal Water Treatment
  if (id === 'ASSET-WTP-002' || id === 'DEMO-WTP-002' || name.includes('chambal') || name.includes('clarifier')) {
    return chambalWaterTreatmentThumb;
  }

  // 5. Western Ghats Culvert
  if (id === 'ASSET-HWY-003' || name.includes('culvert') || name.includes('western ghats')) {
    return westernGhatsCulvertThumb;
  }

  // 6. Krishna Canal Lock Gate
  if (id === 'ASSET-CNL-004' || id === 'DEMO-HWY-003' || name.includes('krishna') || name.includes('canal')) {
    return krishnaCanalLockThumb;
  }

  // 7. Peenya Power Substation
  if (id === 'ASSET-SUB-005' || name.includes('peenya') || name.includes('substation')) {
    return peenyaPowerSubstationThumb;
  }

  // 8. Rural Community Health Center
  if (id === 'ASSET-HLT-007' || id === 'ASSET-PUB-007' || name.includes('health') || name.includes('sonbhadra')) {
    return sonbhadraHealthCenterThumb;
  }

  if (asset.category === 'Bridge' || name.includes('bridge') || name.includes('sea link')) {
    return bandraWorliThumbnail;
  }

  return bandraWorliThumbnail;
}

