import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardList,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Send,
  UserCheck,
  FileText,
  Clock,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchAssetInspections,
  createInspection,
  updateInspection,
  verifyInspectionOutcome,
  fetchAssetById,
} from '../services/api';
import {
  getDemoInspections,
  getDemoAssetById,
  createDemoInspection,
  updateDemoInspection,
  verifyDemoInspectionOutcome,
} from '../demo/demoService';

export default function InspectionHistoryModal({
  isOpen,
  onClose,
  asset,
  onAssetUpdated,
  onRefreshGlobal,
  isAdmin = false,
  isDemo = false,
  initialShowAddForm = false,
}) {
  const { t } = useLanguage();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // New Inspection Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState('Structural Audit');
  const [formFindings, setFormFindings] = useState('');
  const [formRecommendedAction, setFormRecommendedAction] = useState('');
  const [formActionTaken, setFormActionTaken] = useState('');
  const [formResponsibleUser, setFormResponsibleUser] = useState(
    'Engineering Officer (Field Audit Unit)'
  );
  const [formEvidenceRef, setFormEvidenceRef] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Status Update State
  const [updatingInspId, setUpdatingInspId] = useState(null);

  // Verification Form State
  const [verifyingInspId, setVerifyingInspId] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationDate, setVerificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [verifierName, setVerifierName] = useState('Senior Verification Engineer');
  const [verificationOutcome, setVerificationOutcome] = useState('Remediation Successful');
  const [verificationActionTaken, setVerificationActionTaken] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const canManage = isAdmin || isDemo;

  // Load inspections from backend or demoService
  const loadInspections = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        const data = await getDemoInspections(asset.id);
        setInspections(data || []);
        return;
      }
      const data = await fetchAssetInspections(asset.id);
      setInspections(data || []);
    } catch (err) {
      console.error('Failed to load inspections:', err);
      setError(err.message || 'Failed to load inspection records from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && asset?.id) {
      loadInspections();
      setActionSuccess(null);
      setError(null);
      setShowAddForm(Boolean(initialShowAddForm));
      setVerifyingInspId(null);
    }
  }, [isOpen, asset?.id, initialShowAddForm]);

  // Synchronize asset telemetry across parent views
  const refreshParentAsset = async () => {
    try {
      if (isDemo) {
        const updatedAsset = await getDemoAssetById(asset.id);
        if (onAssetUpdated) onAssetUpdated(updatedAsset);
        return;
      }
      const updatedAsset = await fetchAssetById(asset.id);
      if (onAssetUpdated) {
        onAssetUpdated(updatedAsset);
      }
      if (onRefreshGlobal) {
        onRefreshGlobal();
      }
    } catch (err) {
      console.warn('Could not refresh parent asset detail:', err);
    }
  };

  // Create Inspection Handler
  const handleCreateInspection = async (e) => {
    e.preventDefault();
    if (submittingCreate) return;

    setError(null);
    setActionSuccess(null);

    // Validate required fields
    if (!formDate.trim()) {
      setError('Inspection date is required.');
      return;
    }
    if (!formType.trim()) {
      setError('Inspection type is required.');
      return;
    }
    if (!formFindings.trim()) {
      setError('Observed structural findings description is required.');
      return;
    }

    setSubmittingCreate(true);
    if (isDemo) {
      try {
        await createDemoInspection();
      } catch (err) {
        setError(err.message || 'Demo Mode: Recording inspections is disabled.');
      } finally {
        setSubmittingCreate(false);
      }
      return;
    }

    try {
      const payload = {
        inspection_date: formDate.trim(),
        inspection_type: formType.trim(),
        findings: formFindings.trim(),
        recommended_action: formRecommendedAction.trim() || undefined,
        actual_action_taken: formActionTaken.trim() || undefined,
        responsible_user: formResponsibleUser.trim() || undefined,
        evidence_references: formEvidenceRef.trim() || undefined,
      };

      const newInsp = await createInspection(asset.id, payload);
      setActionSuccess(
        `Inspection ${newInsp.id} recorded successfully! Asset risk score & health index recalculated.`
      );

      // Reset form
      setFormFindings('');
      setFormRecommendedAction('');
      setFormActionTaken('');
      setFormEvidenceRef('');
      setShowAddForm(false);

      // Refresh records and parent asset
      await loadInspections();
      await refreshParentAsset();
    } catch (err) {
      console.error('Failed to record inspection:', err);
      setError(err.message || 'Failed to record inspection.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (inspectionId, newStatus) => {
    if (updatingInspId === inspectionId) return;

    setError(null);
    setActionSuccess(null);

    if (isDemo) {
      try {
        await updateDemoInspection();
      } catch (err) {
        setError(err.message || 'Demo Mode: Updating inspection statuses is disabled.');
      }
      return;
    }

    setUpdatingInspId(inspectionId);
    try {
      await updateInspection(inspectionId, { status: newStatus });
      setActionSuccess(`Inspection ${inspectionId} status updated to "${newStatus}".`);
      await loadInspections();
      await refreshParentAsset();
    } catch (err) {
      console.error(`Failed to update inspection ${inspectionId}:`, err);
      setError(err.message || `Failed to update status for ${inspectionId}.`);
    } finally {
      setUpdatingInspId(null);
    }
  };

  // Verify Outcome Handler
  const handleVerifySubmit = async (inspectionId) => {
    if (submittingVerify) return;

    setError(null);
    setActionSuccess(null);

    if (!verificationNotes.trim()) {
      setError('Verification notes confirming remediation efficacy are required.');
      return;
    }

    setSubmittingVerify(true);

    if (isDemo) {
      try {
        await verifyDemoInspectionOutcome();
      } catch (err) {
        setError(err.message || 'Demo Mode: Verification is disabled.');
      } finally {
        setSubmittingVerify(false);
      }
      return;
    }

    try {
      const payload = {
        verification_notes: verificationNotes.trim(),
        verification_date: verificationDate.trim() || undefined,
        verifier_name: verifierName.trim() || undefined,
        outcome: verificationOutcome,
        actual_action_taken: verificationActionTaken.trim() || undefined,
      };

      await verifyInspectionOutcome(inspectionId, payload);
      setActionSuccess(
        `Outcome verified as "${verificationOutcome}" for inspection ${inspectionId}! Parent asset risk state recalculated.`
      );
      setVerifyingInspId(null);
      setVerificationNotes('');
      setVerificationActionTaken('');
      setVerificationOutcome('Remediation Successful');

      await loadInspections();
      await refreshParentAsset();
    } catch (err) {
      console.error(`Failed to verify inspection ${inspectionId}:`, err);
      setError(err.message || `Verification failed for inspection ${inspectionId}.`);
    } finally {
      setSubmittingVerify(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 relative max-h-[90vh] flex flex-col text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-green-700 uppercase">
                  {asset.id}
                </span>
                <span className="text-xs text-slate-500">&bull; {asset.category}</span>
                <span className="text-xs text-slate-500">
                  &bull; {asset.district}, {asset.state}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {t('inspections.modalTitle', '{name} — Inspection Lifecycle & History', { name: asset.name })}
              </h3>
            </div>
          </div>

          <button
            id="btn-close-inspections-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Asset Status Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {t('inspections.currentStatus', 'Current Status')}
            </span>
            <div className="mt-1">
              <StatusBadge status={asset.status} />
            </div>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {t('inspections.riskScoreTier', 'Risk Score & Tier')}
            </span>
            <span
              className={`font-mono font-bold text-sm mt-0.5 block ${
                asset.risk_score >= 80
                  ? 'text-red-600'
                  : asset.risk_score >= 50
                  ? 'text-amber-700'
                  : 'text-green-700'
              }`}
            >
              {asset.risk_score} / 100 ({asset.risk_level})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {t('inspections.healthIndex', 'Health Index')}
            </span>
            <span className="font-mono font-bold text-sm text-green-700 mt-0.5 block">
              {asset.health_index}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              {t('inspections.lastRecordedInspection', 'Last Recorded Inspection')}
            </span>
            <span className="font-mono font-semibold text-slate-700 mt-0.5 block">
              {asset.last_inspection_date || 'None'}
            </span>
          </div>
        </div>

        {/* Action Banners */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-start gap-2.5 text-xs text-green-800">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-green-600 hover:text-green-800 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">
              {t('inspections.recordedCount', 'Recorded Inspections: {count}', { count: inspections.length })}
            </span>
            <button
              onClick={loadInspections}
              disabled={loading}
              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title={t('inspections.refreshTooltip', 'Refresh inspection list')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {canManage && (
            <button
              id="btn-toggle-new-inspection-form"
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                isDemo
                  ? 'bg-slate-100 hover:bg-slate-200 text-amber-800 border border-amber-300'
                  : 'bg-green-700 hover:bg-green-800 text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{showAddForm ? t('inspections.closeForm', 'Close Form') : isDemo ? t('inspections.recordNewInspectionDemo', 'Record New Inspection (Demo)') : t('inspections.recordNewInspection', 'Record New Inspection')}</span>
            </button>
          )}
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* New Inspection Form (Admin / Demo Protected) */}
          {showAddForm && canManage && (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-green-800 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4" />
                  <span>{t('inspections.logFieldInspection', 'Log Field Inspection & Recommended Action')}</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  {t('inspections.targetAsset', 'Target Asset: {id}', { id: asset.id })}
                </span>
              </div>

              <form onSubmit={handleCreateInspection} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">
                      {t('inspections.inspectionDate', 'Inspection Date')} <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="input-insp-date"
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">
                      {t('inspections.inspectionType', 'Inspection / Audit Type')} <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="input-insp-type"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                      required
                    >
                      <option value="Structural Audit">Structural Audit</option>
                      <option value="Underwater Sonar Bathymetry">Underwater Sonar Bathymetry</option>
                      <option value="Tri-axial Vibration Spectrum">Tri-axial Vibration Spectrum</option>
                      <option value="NDT Ultrasonic Crack Depth">NDT Ultrasonic Crack Depth</option>
                      <option value="Emergency Post-Weather Survey">Emergency Post-Weather Survey</option>
                      <option value="Routine Maintenance Clearing">Routine Maintenance Clearing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-medium">
                    Observed Structural Findings <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="input-insp-findings"
                    rows="3"
                    value={formFindings}
                    onChange={(e) => setFormFindings(e.target.value)}
                    placeholder="Document verified anomalies, crack widths, scour depths, sensor discrepancies..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">
                      Recommended Engineering Action (Optional)
                    </label>
                    <input
                      id="input-insp-recommended-action"
                      type="text"
                      value={formRecommendedAction}
                      onChange={(e) => setFormRecommendedAction(e.target.value)}
                      placeholder="e.g. Boulder dumping around pier base, bearing replacement"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">
                      Actual Action Taken (Optional)
                    </label>
                    <input
                      id="input-insp-action-taken"
                      type="text"
                      value={formActionTaken}
                      onChange={(e) => setFormActionTaken(e.target.value)}
                      placeholder="e.g. Emergency speed limit imposed, repair contract tendered"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">
                      Responsible Inspector / User
                    </label>
                    <input
                      id="input-insp-responsible-user"
                      type="text"
                      value={formResponsibleUser}
                      onChange={(e) => setFormResponsibleUser(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-medium">
                      Evidence References (Reports / Photos)
                    </label>
                    <input
                      id="input-insp-evidence-ref"
                      type="text"
                      value={formEvidenceRef}
                      onChange={(e) => setFormEvidenceRef(e.target.value)}
                      placeholder="e.g. Structural_Audit_Report_2026.pdf, sonar_mesh.bin"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={submittingCreate}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-inspection"
                    type="submit"
                    disabled={submittingCreate}
                    className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {submittingCreate ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{submittingCreate ? 'Saving & Recalculating...' : 'Save & Recalculate Risk'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Inspections List */}
          {loading ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <Loader2 className="w-6 h-6 text-green-700 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading inspection history from database...</p>
            </div>
          ) : inspections.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">No Inspection Records Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No physical audits or sensor surveys have been recorded for this asset yet. Click "Record New Inspection" above to log field observations.
              </p>
            </div>
          ) : (
            inspections.map((insp) => (
              <div
                key={insp.id}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3.5 transition-all"
              >
                {/* Inspection Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-green-700 uppercase">
                        {insp.id}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        &bull; {insp.inspection_date}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          insp.status === 'Verified'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : insp.status === 'Completed'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : insp.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {insp.status}
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-900 text-sm mt-1">
                      {insp.inspection_type}
                    </h5>
                  </div>

                  {/* Actions Bar for Record (Admin / Demo Protected) */}
                  {canManage && (
                    <div className="flex items-center gap-2">
                      {/* Status Select for unverified inspections */}
                      {insp.status !== 'Verified' && (
                        <div className="flex items-center gap-1.5">
                          <label htmlFor={`select-status-${insp.id}`} className="text-[10px] text-slate-500 uppercase">Status:</label>
                          <select
                            id={`select-status-${insp.id}`}
                            value={insp.status}
                            disabled={updatingInspId === insp.id}
                            onChange={(e) => handleStatusChange(insp.id, e.target.value)}
                            className="bg-white border border-slate-300 text-xs text-slate-900 py-1 px-2 rounded-lg focus:outline-none focus:border-green-600 disabled:opacity-50"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                          {updatingInspId === insp.id && (
                            <Loader2 className="w-3 h-3 text-green-700 animate-spin" />
                          )}
                        </div>
                      )}

                      {/* Verify Outcome Button */}
                      {insp.status !== 'Verified' && (
                        <button
                          id={`btn-verify-${insp.id}`}
                          type="button"
                          onClick={() => {
                            setVerifyingInspId((curr) => (curr === insp.id ? null : insp.id));
                            setVerificationNotes('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{verifyingInspId === insp.id ? 'Cancel Verify' : 'Verify Outcome'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Findings Details */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold uppercase text-[10px] block">
                      Observed Structural Findings
                    </span>
                    <p className="text-slate-800 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {insp.findings}
                    </p>
                  </div>

                  {/* Remediation Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {insp.recommended_action && (
                      <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-900">
                        <span className="font-bold block text-[10px] uppercase text-green-700">
                          Recommended Action
                        </span>
                        <span className="mt-0.5 block leading-snug">{insp.recommended_action}</span>
                      </div>
                    )}

                    {insp.actual_action_taken && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                        <span className="font-bold block text-[10px] uppercase text-slate-600">
                          Actual Action Taken
                        </span>
                        <span className="mt-0.5 block leading-snug">{insp.actual_action_taken}</span>
                      </div>
                    )}
                  </div>

                  {/* Certified Outcome Verification Display (When Verified) */}
                  {insp.status === 'Verified' && (
                    <div className="p-3.5 rounded-xl bg-green-50/50 border border-green-200 text-slate-800 text-xs space-y-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-green-700" />
                          <span className="text-slate-900">Certified Outcome Verification</span>
                          <span
                            className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              insp.verification_outcome === 'Remediation Unsuccessful'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : insp.verification_outcome === 'Further Assessment Required'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}
                          >
                            {insp.verification_outcome || 'Remediation Successful'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Date: {insp.verification_date || 'Certified'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 leading-relaxed">
                        {insp.verification_notes || 'Efficacy confirmed by structural engineering team.'}
                      </p>
                    </div>
                  )}

                  {/* Footnote Metadata */}
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                    <span>Officer / Sign-off: {insp.responsible_user || 'Engineering Authority'}</span>
                    {insp.evidence_references && (
                      <span className="font-mono text-green-700">Ref: {insp.evidence_references}</span>
                    )}
                  </div>
                </div>

                {/* Inline Outcome Verification Form (Admin / Demo Protected) */}
                {verifyingInspId === insp.id && canManage && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-green-300 space-y-3 mt-2 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-green-800 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" />
                        <span>{t('inspections.confirmVerifiedIntervention', 'Confirm Verified Intervention for {id}', { id: insp.id })}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">{t('inspections.closedLoopVerification', 'Closed-Loop Verification')}</span>
                    </div>

                    {insp.status !== 'Completed' && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                        <span>{t('inspections.mustReachCompletedNotice', "Inspection is currently in '{status}' state. It must reach 'Completed' before verification.", { status: insp.status })}</span>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(insp.id, 'Completed')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] cursor-pointer"
                        >
                          {t('inspections.markAsCompleted', 'Mark as Completed')}
                        </button>
                      </div>
                    )}

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="text-slate-700 block mb-1 font-medium">
                          {t('inspections.verificationNotesLabel', 'Verification Engineering Notes')} <span className="text-red-600">*</span>
                        </label>
                        <textarea
                          id={`textarea-verify-notes-${insp.id}`}
                          rows="2"
                          value={verificationNotes}
                          onChange={(e) => setVerificationNotes(e.target.value)}
                          placeholder="Document verified repair outcome (e.g., 'Post-intervention ultrasonic scan confirms fissure filled; vibration normalized below 2.0 mm/s. Safe for full traffic.')..."
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-700 block mb-1 font-medium">
                            {t('inspections.outcomeDecisionLabel', 'Remediation Outcome Decision')} <span className="text-red-600">*</span>
                          </label>
                          <select
                            id={`select-verify-outcome-${insp.id}`}
                            value={verificationOutcome}
                            onChange={(e) => setVerificationOutcome(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-green-600 font-medium"
                          >
                            <option value="Remediation Successful">Remediation Successful (Risk Discount)</option>
                            <option value="Remediation Unsuccessful">Remediation Unsuccessful (No Discount)</option>
                            <option value="Further Assessment Required">Further Assessment Required (No Discount)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-700 block mb-1 font-medium">
                            {t('inspections.actualInterventionWork', 'Actual Intervention Work Taken')}
                          </label>
                          <input
                            id={`input-verify-action-${insp.id}`}
                            type="text"
                            value={verificationActionTaken || insp.actual_action_taken || ''}
                            onChange={(e) => setVerificationActionTaken(e.target.value)}
                            placeholder="e.g. 45 tonnes granite rip-rap placed around pier base"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-green-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-700 block mb-1 font-medium">
                            {t('inspections.verificationDateLabel', 'Verification Date')}
                          </label>
                          <input
                            type="date"
                            value={verificationDate}
                            onChange={(e) => setVerificationDate(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-green-600"
                          />
                        </div>
                        <div>
                          <label className="text-slate-700 block mb-1 font-medium">
                            {t('inspections.verifierNameLabel', 'Verifier Authority / Name')}
                          </label>
                          <input
                            type="text"
                            value={verifierName}
                            onChange={(e) => setVerifierName(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-green-600"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyingInspId(null);
                            setVerificationNotes('');
                          }}
                          disabled={submittingVerify}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          id={`btn-submit-verify-${insp.id}`}
                          type="button"
                          onClick={() => handleVerifySubmit(insp.id)}
                          disabled={submittingVerify || insp.status !== 'Completed'}
                          className="px-4 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                        >
                          {submittingVerify ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{submittingVerify ? t('inspections.certifying', 'Certifying...') : t('inspections.certifyButton', 'Certify Outcome & Update Risk')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
