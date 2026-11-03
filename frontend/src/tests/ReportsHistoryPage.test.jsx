import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportsHistoryPage from '../pages/ReportsHistoryPage';
import { LanguageProvider } from '../context/LanguageContext';

const mockAssets = [
  {
    id: 'ASSET-DRN-006',
    name: 'Mithi River Stormwater Tidal Outfall Sluice Gate',
    category: 'Drainage',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    risk_score: 91.2,
  },
  {
    id: 'ASSET-BRG-001',
    name: 'Mandovi River Estuary Bridge - Pier 4 & 5',
    category: 'Bridge',
    district: 'North Goa',
    state: 'Goa',
    risk_score: 88.5,
  },
];

function renderWithProviders(ui) {
  return render(
    <LanguageProvider>
      {ui}
    </LanguageProvider>
  );
}

describe('ReportsHistoryPage UI Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders page header with title, subtitle, and asset selector', () => {
    renderWithProviders(
      <ReportsHistoryPage
        assets={mockAssets}
        selectedAsset={mockAssets[0]}
        isDemo={true}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: /Reports & History/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Generate reports, view assessment summaries and track the complete history of an asset/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Select Asset')).toBeInTheDocument();
    expect(screen.getAllByText('Mithi River Stormwater Tidal Outfall Sluice Gate').length).toBeGreaterThan(0);
  });

  it('2. Renders all 4 summary cards with correct numerical values', () => {
    renderWithProviders(
      <ReportsHistoryPage
        assets={mockAssets}
        selectedAsset={mockAssets[0]}
        isDemo={true}
      />
    );

    expect(screen.getByText('Total Reports')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();

    expect(screen.getByText('Inspections')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    expect(screen.getByText('Interventions')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    expect(screen.getByText('Open Defects')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('3. Renders the 5 category filter buttons and filters table accordingly', () => {
    renderWithProviders(
      <ReportsHistoryPage
        assets={mockAssets}
        selectedAsset={mockAssets[0]}
        isDemo={true}
      />
    );

    const allBtn = screen.getByRole('button', { name: 'All Reports' });
    const inspBtn = screen.getByRole('button', { name: 'Inspection' });
    const assessBtn = screen.getByRole('button', { name: 'Assessment' });
    const intervBtn = screen.getByRole('button', { name: 'Intervention' });
    const complBtn = screen.getByRole('button', { name: 'Compliance' });

    expect(allBtn).toBeInTheDocument();
    expect(inspBtn).toBeInTheDocument();
    expect(assessBtn).toBeInTheDocument();
    expect(intervBtn).toBeInTheDocument();
    expect(complBtn).toBeInTheDocument();

    // Default view shows page 1 of 36 reports
    expect(screen.getByText(/Showing 1 – 5 of 36 reports/i)).toBeInTheDocument();

    // Filter by Inspection
    fireEvent.click(inspBtn);
    expect(screen.getByText(/Showing 1 – 5 of 12 reports/i)).toBeInTheDocument();

    // Filter by Compliance
    fireEvent.click(complBtn);
    expect(screen.getByText(/Showing 1 – 5 of 6 reports/i)).toBeInTheDocument();
  });

  it('4. Renders reports table with serial numbers, titles, badges, and action buttons', () => {
    const handleOpenDocument = vi.fn();
    renderWithProviders(
      <ReportsHistoryPage
        assets={mockAssets}
        selectedAsset={mockAssets[0]}
        onOpenDocument={handleOpenDocument}
        isDemo={true}
      />
    );

    // Matches the exact titles from reference image
    expect(screen.getByText('Infrastructure Inspection Report (Feb 2024)')).toBeInTheDocument();
    expect(screen.getByText('Structural Assessment – Gate Mechanism')).toBeInTheDocument();
    expect(screen.getByText('Maintenance & Remediation Plan')).toBeInTheDocument();
    expect(screen.getByText('Compliance Verification Report')).toBeInTheDocument();
    expect(screen.getByText('Asset Condition Summary')).toBeInTheDocument();

    // Action buttons exist
    const viewButtons = screen.getAllByTitle('View Report');
    expect(viewButtons.length).toBe(5);

    // Clicking View invokes document opener
    fireEvent.click(viewButtons[0]);
    expect(handleOpenDocument).toHaveBeenCalledWith('Mithi_River_Sluice_Gate_Inspection_2024.txt');
  });

  it('5. Renders vertical connected Asset History Timeline with events', () => {
    renderWithProviders(
      <ReportsHistoryPage
        assets={mockAssets}
        selectedAsset={mockAssets[0]}
        isDemo={true}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Asset History Timeline' })).toBeInTheDocument();
    expect(screen.getByText('Inspection Conducted')).toBeInTheDocument();
    expect(screen.getByText('Routine inspection completed and report uploaded.')).toBeInTheDocument();
    expect(screen.getByText('Feb 19, 2024')).toBeInTheDocument();

    expect(screen.getByText('Intervention Started')).toBeInTheDocument();
    expect(screen.getByText('Partial repair and gate mechanism service initiated.')).toBeInTheDocument();
    expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();

    expect(screen.getByText('Assessment Completed')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Completed')).toBeInTheDocument();
  });

  it('6. Renders Recent Activities and opens full activity history modal', () => {
    renderWithProviders(
      <ReportsHistoryPage
        assets={mockAssets}
        selectedAsset={mockAssets[0]}
        isDemo={true}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Recent Activities' })).toBeInTheDocument();
    expect(screen.getByText('New report uploaded: Structural Assessment.pdf')).toBeInTheDocument();
    expect(screen.getByText('Inspection record updated')).toBeInTheDocument();
    expect(screen.getByText('Intervention marked as In Progress')).toBeInTheDocument();
    expect(screen.getByText('Asset details modified')).toBeInTheDocument();

    // Click "View All"
    const viewAllBtn = screen.getByRole('button', { name: /View All/i });
    fireEvent.click(viewAllBtn);

    expect(screen.getByText('Complete Application Activity History')).toBeInTheDocument();
  });

  it('7. Opens Generate Report modal when clicking Generate Report button', () => {
    renderWithProviders(
      <ReportsHistoryPage
        assets={mockAssets}
        selectedAsset={mockAssets[0]}
        isDemo={true}
      />
    );

    const generateBtn = screen.getByRole('button', { name: /Generate Report/i });
    fireEvent.click(generateBtn);

    expect(screen.getByText('Generate Infrastructure Intelligence Report')).toBeInTheDocument();
    expect(screen.getByText('Target Infrastructure Asset')).toBeInTheDocument();
    expect(screen.getByText('Report Type & Standard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate & Download/i })).toBeInTheDocument();
  });
});
