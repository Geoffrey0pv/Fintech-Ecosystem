'use client';

import { FormEvent, useState } from 'react';
import { AuthGuard } from '../../components/auth-guard';
import { Card, buttonStyle, ErrorText, inputStyle } from '../../components/ui';
import { useBudgetStatus, useUpsertBudget } from '../../hooks/use-budgets';
import { useCategories, useCreateCategory, useDeleteCategory } from '../../hooks/use-categories';
import { ApiError } from '../../lib/api-client';
import { BudgetStatus } from '../../lib/types';

function alertLabel(status: BudgetStatus): { text: string; color: string } {
  if (status.alert === 'CRITICAL_100') return { text: '🔴 Superado', color: '#f87171' };
  if (status.alert === 'WARNING_80') return { text: '🟠 80%+', color: '#f59e0b' };
  return { text: '🟢 OK', color: '#34d399' };
}

function BudgetsView() {
  const { data: categories } = useCategories();
  const status = useBudgetStatus();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const upsertBudget = useUpsertBudget();

  const [name, setName] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();

  const onCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      await createCategory.mutateAsync(name);
      setName('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    }
  };

  const onSetBudget = async (categoryId: string) => {
    setError(undefined);
    try {
      await upsertBudget.mutateAsync({ categoryId, amount: amounts[categoryId] ?? '' });
      setAmounts((a) => ({ ...a, [categoryId]: '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    }
  };

  return (
    <>
      <h1>Categorías y presupuestos</h1>

      <Card title="Nueva categoría">
        <form onSubmit={onCreateCategory} style={{ display: 'flex', gap: '0.7rem' }}>
          <input
            placeholder="Nombre de la categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            required
          />
          <button type="submit" style={buttonStyle} disabled={createCategory.isPending}>
            Crear
          </button>
        </form>
        <ErrorText message={error} />
      </Card>

      <Card title="Estado del mes actual">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
              <th>Categoría</th>
              <th style={{ textAlign: 'right' }}>Presupuesto</th>
              <th style={{ textAlign: 'right' }}>Gastado</th>
              <th style={{ textAlign: 'right' }}>Uso</th>
              <th>Estado</th>
              <th>Asignar presupuesto</th>
            </tr>
          </thead>
          <tbody>
            {status.data?.map((s) => {
              const label = alertLabel(s);
              return (
                <tr key={s.categoryId} style={{ borderTop: '1px solid #1e293b' }}>
                  <td>{s.categoryName}</td>
                  <td style={{ textAlign: 'right' }}>{s.budget}</td>
                  <td style={{ textAlign: 'right' }}>{s.spent}</td>
                  <td style={{ textAlign: 'right' }}>{s.usagePercent}%</td>
                  <td style={{ color: label.color }}>{label.text}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        placeholder="monto"
                        value={amounts[s.categoryId] ?? ''}
                        onChange={(e) =>
                          setAmounts((a) => ({ ...a, [s.categoryId]: e.target.value }))
                        }
                        style={{ ...inputStyle, width: 120 }}
                      />
                      <button
                        style={buttonStyle}
                        onClick={() => onSetBudget(s.categoryId)}
                        disabled={upsertBudget.isPending}
                      >
                        Guardar
                      </button>
                      <button
                        style={{ ...buttonStyle, background: '#7f1d1d' }}
                        onClick={() => deleteCategory.mutate(s.categoryId)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {categories && categories.length === 0 && (
          <p style={{ color: '#94a3b8' }}>Crea una categoría para empezar.</p>
        )}
      </Card>
    </>
  );
}

export default function BudgetsPage() {
  return (
    <AuthGuard>
      <BudgetsView />
    </AuthGuard>
  );
}
