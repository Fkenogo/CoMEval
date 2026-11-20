import React from 'react';
import { MealProvider, useMeal } from './context/MealContext';
import { AppShell } from './components/layout/AppShell';
import { InspectorDrawer } from './components/shared/InspectorDrawer';
import { WalkthroughDrawer } from './components/shared/WalkthroughDrawer';
import { PortfolioView } from './components/modules/PortfolioView';
import { RoleHomeView } from './components/modules/RoleHomeView';
import { OverviewView } from './components/modules/OverviewView';
import { DocumentsCommitmentsView } from './components/modules/DocumentsCommitmentsView';
import { WorkplanView } from './components/modules/WorkplanView';
import { ResultsFrameworkView } from './components/modules/ResultsFrameworkView';
import { FieldCaptureReportingView } from './components/modules/FieldCaptureReportingView';
import { SurveysView } from './components/modules/SurveysView';
import { ChecksActionsView } from './components/modules/ChecksActionsView';
import { KnowledgeLearningView } from './components/modules/KnowledgeLearningView';
import { EvaluationWorkspaceView } from './components/modules/EvaluationWorkspaceView';
import { ReportsExportsView } from './components/modules/ReportsExportsView';
import { GeographySettingsView } from './components/modules/GeographySettingsView';

const ActiveModuleRouter: React.FC = () => {
  const { state } = useMeal();

  switch (state.activeModule) {
    case 'portfolio':
      return <PortfolioView />;
    case 'role_home':
      return <RoleHomeView />;
    case 'overview':
      return <OverviewView />;
    case 'documents':
      return <DocumentsCommitmentsView />;
    case 'workplan':
      return <WorkplanView />;
    case 'results':
      return <ResultsFrameworkView />;
    case 'capture':
      return <FieldCaptureReportingView />;
    case 'surveys':
      return <SurveysView />;
    case 'checks':
      return <ChecksActionsView />;
    case 'knowledge':
      return <KnowledgeLearningView />;
    case 'evaluation':
      return <EvaluationWorkspaceView />;
    case 'reports':
      return <ReportsExportsView />;
    case 'settings':
      return <GeographySettingsView />;
    default:
      return <PortfolioView />;
  }
};

export default function App() {
  return (
    <MealProvider>
      <AppShell>
        <ActiveModuleRouter />
      </AppShell>
      <InspectorDrawer />
      <WalkthroughDrawer />
    </MealProvider>
  );
}
