import { Receipt } from '@/components/Receipt';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { useStore, type DrawerState, type ModalState } from '@/store/useStore';
import CampaignDrawer from './campaigns/CampaignDrawer';
import Composer from './campaigns/Composer';
import ClientDrawer from './clients/ClientDrawer';
import PlanForm from './clients/PlanForm';
import EnquiryModal from './leads/EnquiryModal';
import LeadDrawer from './leads/LeadDrawer';
import NewLead from './leads/NewLead';
import CollectDrawer from './payments/CollectDrawer';
import { NewRep } from './team/TeamPage';
import { useEffect, useState } from 'react';

const DRAWER_LABEL: Record<DrawerState['k'], string> = { lead: 'Lead', client: 'Member', newLead: 'Add lead', conv: 'Membership', collect: 'Collect payment', newRep: 'Add team member', campaign: 'Campaign' };

/** keep the last value while the overlay animates out */
function useSticky<T>(v: T | null) {
  const [last, setLast] = useState(v);
  useEffect(() => { if (v) setLast(v); }, [v]);
  return v || last;
}

function drawerBody(d: DrawerState) {
  switch (d.k) {
    case 'lead': return <LeadDrawer id={d.id} />;
    case 'client': return <ClientDrawer id={d.id} />;
    case 'newLead': return <NewLead {...d} />;
    case 'conv': return <PlanForm key={d.key} ctx={d.ctx} init={d.conv} />;
    case 'collect': return <CollectDrawer id={d.id} />;
    case 'newRep': return <NewRep />;
    case 'campaign': return <CampaignDrawer id={d.id} />;
  }
}

function modalBody(m: ModalState) {
  switch (m.k) {
    case 'receipt': return <Receipt no={m.no} />;
    case 'enquiry': return <EnquiryModal />;
    case 'composer': return <Composer seg={m.seg} />;
  }
}
const modalLabel = (m: ModalState) => m.k === 'receipt' ? `Receipt ${m.no}` : m.k === 'enquiry' ? 'Enquiry link' : 'New campaign';

/** the single overlay layer: one drawer and one modal at most, like the prototype */
export default function Overlays() {
  const drawer = useStore(s => s.drawer), modal = useStore(s => s.modal);
  const d = useSticky(drawer), m = useSticky(modal);
  const s = useStore.getState();
  return (
    <>
      <Drawer open={!!drawer} onClose={s.closeDrawer} label={d ? DRAWER_LABEL[d.k] : ''} contentKey={d ? d.k + ('id' in d ? d.id : '') : ''}>
        {d && drawerBody(d)}
      </Drawer>
      <Modal open={!!modal} onClose={s.closeModal} label={m ? modalLabel(m) : ''} bar={false} wide={m?.k !== 'receipt'} className={m?.k === 'composer' ? 'composer' : undefined}>
        {m && modalBody(m)}
      </Modal>
    </>
  );
}
