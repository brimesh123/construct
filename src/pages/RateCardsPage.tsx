
import { useState } from 'react';
import RateCardForm from '@/components/ratecards/RateCardForm';
import RateCardList from '@/components/ratecards/RateCardList';

const RateCardsPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingRateCard(null);
    setShowForm(true);
  };

  const handleEdit = (rateCard: any) => {
    setEditingRateCard(rateCard);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingRateCard(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRateCard(null);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-xl shadow-xl border-2 border-purple-300">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Rate Cards</h2>
        <p className="text-purple-100 mt-2 text-lg">
          Manage employee pay rates and overtime rates
        </p>
      </div>
      
      {showForm ? (
        <RateCardForm
          rateCard={editingRateCard}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      ) : (
        <RateCardList
          onEdit={handleEdit}
          onAdd={handleAdd}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  );
};

export default RateCardsPage;
