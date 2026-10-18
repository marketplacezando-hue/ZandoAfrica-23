import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { AdminAuditLog } from '@/types/zando';
import { FileText, ShieldCheck, User } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const data = await zandoApi.getAuditLogs(100);
      setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Journal d'Audit Administratif</h1>
        <p className="text-xs text-muted-foreground">
          Historique immuable des actions d'administration (modifications de prix, modération, suspensions).
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Administrateur</th>
                <th className="p-3.5 whitespace-nowrap">Action Effectuée</th>
                <th className="p-3.5 whitespace-nowrap">Module</th>
                <th className="p-3.5 whitespace-nowrap">Détails</th>
                <th className="p-3.5 whitespace-nowrap">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Chargement...</td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map(l => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="p-3.5 whitespace-nowrap font-bold text-foreground">
                      {l.admin_email}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-semibold text-primary">
                      {l.action}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {l.entity_type || '-'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-[11px] text-muted-foreground font-mono">
                      {l.details ? JSON.stringify(l.details) : '-'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {new Date(l.created_at).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Aucune entrée dans le journal d'audit pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
