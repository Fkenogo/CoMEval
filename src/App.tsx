import React from 'react';
import { DoArea } from './components/areas/DoArea';
import { LearnArea } from './components/areas/LearnArea';
import { MeasureArea } from './components/areas/MeasureArea';
import { PlanArea } from './components/areas/PlanArea';
import { ProveArea } from './components/areas/ProveArea';
import { ReportArea } from './components/areas/ReportArea';
import { Shell } from './components/layout/Shell';
import { AddProjectModal } from './components/shared/AddProjectModal';
import { WalkthroughGuide } from './components/shared/WalkthroughGuide';
import { MiledgeProvider, useMiledge } from './context/MiledgeContext';

const ActiveAreaView: React.FC = () => {
  const { state } = useMiledge();

  switch (state.activeArea) {
    case 'plan':
      return <PlanArea />;
    case 'do':
      return <DoArea />;
    case 'measure':
      return <MeasureArea />;
    case 'prove':
      return <ProveArea />;
    case 'report':
      return <ReportArea />;
    case 'learn':
      return <LearnArea />;
  }
};

export function App() {
  return (
    <MiledgeProvider>
      <Shell>
        <ActiveAreaView />
      </Shell>
      <AddProjectModal />
      <WalkthroughGuide />
    </MiledgeProvider>
  );
}

export default App;
