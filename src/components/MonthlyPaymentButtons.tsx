"use client";
import React, { useState, useEffect } from 'react';
import { MONTHS_GEORGIAN } from '@/lib/payment';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

interface MonthlyPaymentButtonsProps {
  studentId: string;
  monthlyPayments?: Record<string, 'paid' | 'unpaid'>;
  isReadOnly?: boolean;
  onPaymentUpdated?: (month: string, newStatus: 'paid' | 'unpaid') => void;
  selectedColor?: string;
}

export const MonthlyPaymentButtons: React.FC<MonthlyPaymentButtonsProps> = ({
  studentId,
  monthlyPayments = {},
  isReadOnly = false,
  onPaymentUpdated,
  selectedColor = '#2563eb',
}) => {
  const [paymentsState, setPaymentsState] = useState<Record<string, 'paid' | 'unpaid'>>(monthlyPayments || {});
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);

  useEffect(() => {
    setPaymentsState(monthlyPayments || {});
  }, [monthlyPayments]);

  const handleTogglePayment = async (month: string) => {
    if (isReadOnly || !studentId) return;

    const currentStatus = paymentsState[month] || 'unpaid';
    const nextStatus: 'paid' | 'unpaid' = currentStatus === 'paid' ? 'unpaid' : 'paid';

    // Optimistic UI update
    setPaymentsState(prev => ({ ...prev, [month]: nextStatus }));
    setLoadingMonth(month);

    try {
      const res = await fetch('/api/student/pay-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          month,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        if (onPaymentUpdated) {
          onPaymentUpdated(month, nextStatus);
        }
      } else {
        // Revert on error
        setPaymentsState(prev => ({ ...prev, [month]: currentStatus }));
      }
    } catch (err) {
      console.error('Error updating monthly payment:', err);
      setPaymentsState(prev => ({ ...prev, [month]: currentStatus }));
    } finally {
      setLoadingMonth(null);
    }
  };

  return (
    <div className="monthly-payments-card" style={{
      width: '100%',
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      marginTop: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          💳 თვიური გადასახადები
        </h3>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>
          {isReadOnly ? 'გადახდების სტატუსი (ინფორმაციული)' : 'დააჭირეთ თვეს სტატუსის შესაცვლელად (გადახდილია / გადაუხდელია)'}
        </span>
      </div>

      <div className="monthly-payments-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {MONTHS_GEORGIAN.map(month => {
          const isPaid = paymentsState[month] === 'paid';
          const isLoading = loadingMonth === month;

          return (
            <button
              key={month}
              className="monthly-payment-btn"
              onClick={() => handleTogglePayment(month)}
              disabled={isLoading || isReadOnly}
              title={isReadOnly ? `${month}: ${isPaid ? 'გადახდილია' : 'გადაუხდელია'}` : `დააჭირეთ ${month}-ის გადახდის შესაცვლელად`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 10px',
                borderRadius: '16px',
                border: isPaid ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
                background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: isPaid ? '#10b981' : '#cbd5e1',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isReadOnly ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
                boxShadow: isPaid ? '0 4px 15px rgba(16, 185, 129, 0.2)' : 'none',
                opacity: isLoading ? 0.6 : 1,
              }}
              onMouseOver={(e) => {
                if (!isReadOnly && !isPaid) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = `${selectedColor}aa`;
                }
              }}
              onMouseOut={(e) => {
                if (!isReadOnly && !isPaid) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }
              }}
            >
              <span>{month}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                {isPaid ? (
                  <>
                    <FaCheckCircle size={14} color="#10b981" />
                    <span style={{ color: '#10b981' }}>გადახდილია</span>
                  </>
                ) : (
                  <>
                    <FaExclamationCircle size={14} color="#ef4444" />
                    <span style={{ color: '#ef4444' }}>გადაუხდელია</span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyPaymentButtons;
