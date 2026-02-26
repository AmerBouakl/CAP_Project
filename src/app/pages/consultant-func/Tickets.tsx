import React from 'react';
import { ConsultantTicketsPage } from '../shared/ConsultantTicketsPage';
import { Ticket } from '../../types/entities';

export const FuncTickets: React.FC = () => (
  <ConsultantTicketsPage
    title="My Tickets"
    subtitle="Create and manage your tickets"
    homePath="/consultant-func/dashboard"
    filterFn={(tickets: Ticket[], userId: string) =>
      tickets.filter((t) => t.createdBy === userId)
    }
  />
);
