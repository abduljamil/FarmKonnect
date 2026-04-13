export const CATEGORIES = [
  { label: 'All',         value: 'all',         emoji: '🌾' },
  { label: 'Crops',       value: 'crops',        emoji: '🌽' },
  { label: 'Livestock',   value: 'livestock',    emoji: '🐄' },
  { label: 'Equipment',   value: 'equipment',    emoji: '🚜' },
  { label: 'Fertilizers', value: 'fertilizers',  emoji: '🧪' },
  { label: 'Seeds',       value: 'seeds',        emoji: '🌱' },
  { label: 'Other',       value: 'other',        emoji: '📦' },
];

export const UNITS = ['kg', 'ton', 'piece', 'liter', 'dozen', 'bag', 'acre'];

export const PAYMENT_METHODS = [
  { label: 'Cash on Delivery', value: 'cod',       icon: '💵' },
  { label: 'JazzCash',         value: 'jazzcash',  icon: '📱' },
  { label: 'EasyPaisa',        value: 'easypaisa', icon: '💳' },
];

export const ORDER_STATUS_COLORS = {
  pending:   'warning',
  confirmed: 'info',
  delivered: 'info',
  completed: 'success',
  disputed:  'danger',
  cancelled: 'gray',
};

export const PAYMENT_STATUS_COLORS = {
  pending:   'warning',
  paid:      'success',
  released:  'success',
  failed:    'danger',
  refunded:  'info',
  cancelled: 'gray',
};