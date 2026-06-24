'use client';

import { FormEvent, useState } from 'react';
import { AuthGuard } from '../../components/auth-guard';
import { Card, buttonStyle, ErrorText, inputStyle } from '../../components/ui';
import { useCategories } from '../../hooks/use-categories';
import {
  CreateMovementInput,
  useBalance,
  useCreateMovement,
  useDeleteMovement,
  useMovements,
} from '../../hooks/use-movements';
import { ApiError } from '../../lib/api-client';
import { BudgetAlert, MovementFilters } from '../../lib/types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function MovementsView() {
  const { data: categories } = useCategories();
  const balance = useBalance();
  const createMovement = useCreateMovement();
  const deleteMovement = useDeleteMovement();

  const [filters, setFilters] = useState<MovementFilters>({ page: 1, limit: 10 });
  const movements = useMovements(filters);

  const [form, setForm] = useState<CreateMovementInput>({
    type: 'EXPENSE',
    amount: '',
    description: '',
    categoryId: undefined,
    occurredAt: today(),
  });
  const [error, setError] = useState<string>();
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);

  const categoryName = (id: string | null) =>
    id ? (categories?.find((c) => c.id === id)?.name ?? '—') : '—';

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      const payload: CreateMovementInput = {
        ...form,
        categoryId: form.categoryId || undefined,
      };
      const result = await createMovement.mutateAsync(payload);
      setAlerts(result.alerts);
      setForm({ ...form, amount: '', description: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    }
  };

  const setFilter = (patch: Partial<MovementFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  return (
    <>
      <h1>Movimientos</h1>

      <Card title="Balance actual">
        {balance.data ? (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <Metric label="Ingresos" value={balance.data.totalIncome} color="#34d399" />
            <Metric label="Egresos" value={balance.data.totalExpense} color="#f87171" />
            <Metric label="Balance" value={balance.data.balance} color="#38bdf8" />
          </div>
        ) : (
          'Cargando…'
        )}
      </Card>

      {alerts.length > 0 && (
        <div data-testid="alerts">
          {alerts.map((a) => (
            <div
              key={a.categoryId}
              style={{
                background: a.alert === 'CRITICAL_100' ? '#7f1d1d' : '#78350f',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '0.7rem 1rem',
                marginBottom: '0.8rem',
              }}
            >
              <strong>{a.alert === 'CRITICAL_100' ? '🔴 Presupuesto superado' : '🟠 Alerta'}</strong>{' '}
              — {a.categoryName}: {a.usagePercent}% ({a.spent} / {a.budget})
            </div>
          ))}
        </div>
      )}

      <Card title="Registrar movimiento">
        <form onSubmit={onCreate} style={{ display: 'grid', gap: '0.7rem', maxWidth: 480 }}>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' })}
            style={inputStyle}
          >
            <option value="EXPENSE">Egreso</option>
            <option value="INCOME">Ingreso</option>
          </select>
          <input
            placeholder="Valor (ej. 150000.00)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            style={inputStyle}
            required
          />
          <input
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={inputStyle}
            required
          />
          <select
            value={form.categoryId ?? ''}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}
            style={inputStyle}
          >
            <option value="">Sin categoría</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.occurredAt}
            onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle} disabled={createMovement.isPending}>
            Guardar
          </button>
          <ErrorText message={error} />
        </form>
      </Card>

      <Card title="Filtros">
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
          <select
            value={filters.type ?? ''}
            onChange={(e) => setFilter({ type: (e.target.value || undefined) as MovementFilters['type'] })}
            style={{ ...inputStyle, width: 'auto' }}
          >
            <option value="">Todos los tipos</option>
            <option value="INCOME">Ingresos</option>
            <option value="EXPENSE">Egresos</option>
          </select>
          <select
            value={filters.categoryId ?? ''}
            onChange={(e) => setFilter({ categoryId: e.target.value || undefined })}
            style={{ ...inputStyle, width: 'auto' }}
          >
            <option value="">Todas las categorías</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.startDate ?? ''}
            onChange={(e) => setFilter({ startDate: e.target.value || undefined })}
            style={{ ...inputStyle, width: 'auto' }}
          />
          <input
            type="date"
            value={filters.endDate ?? ''}
            onChange={(e) => setFilter({ endDate: e.target.value || undefined })}
            style={{ ...inputStyle, width: 'auto' }}
          />
        </div>
      </Card>

      <Card title="Historial">
        {movements.isError && <ErrorText message="No se pudieron cargar los movimientos" />}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {movements.data?.items.map((m) => (
              <tr key={m.id} style={{ borderTop: '1px solid #1e293b' }}>
                <td>{m.occurredAt}</td>
                <td style={{ color: m.type === 'INCOME' ? '#34d399' : '#f87171' }}>
                  {m.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                </td>
                <td>{m.description}</td>
                <td>{categoryName(m.categoryId)}</td>
                <td style={{ textAlign: 'right' }}>{m.amount}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => deleteMovement.mutate(m.id)}
                    style={{ ...buttonStyle, background: '#7f1d1d', padding: '0.2rem 0.6rem' }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.data && movements.data.items.length === 0 && (
          <p style={{ color: '#94a3b8' }}>Sin movimientos.</p>
        )}
        {movements.data && (
          <Pager
            page={movements.data.pagination.page}
            totalPages={movements.data.pagination.totalPages}
            onPage={(page) => setFilters((f) => ({ ...f, page }))}
          />
        )}
      </Card>
    </>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{label}</div>
      <div style={{ color, fontSize: '1.4rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
      <button style={buttonStyle} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button style={buttonStyle} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Siguiente
      </button>
    </div>
  );
}

export default function MovementsPage() {
  return (
    <AuthGuard>
      <MovementsView />
    </AuthGuard>
  );
}
