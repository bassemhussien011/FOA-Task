import { calculatePrice, MenuItem, Order } from './order.models';

const menu: MenuItem[] = [
  { id: 'm2', name: 'Chicken Shawarma Plate', category: 'Mains', price: 165 },
  { id: 'm6', name: 'Fresh Mango Juice', category: 'Drinks', price: 60 },
];

function makeOrder(type: Order['type']): Order {
  return {
    id: '1041', number: 1041, type, table: type === 'dine-in' ? 7 : null,
    phone: null, status: 'new', createdAt: '2026-09-27T09:22:00.000Z',
    items: [{ menuId: 'm2', qty: 2, note: '' }, { menuId: 'm6', qty: 2, note: '' }],
  };
}

describe('calculatePrice', () => {
  it('adds 12% dine-in service before calculating 14% VAT', () => {
    expect(calculatePrice(makeOrder('dine-in'), menu)).toEqual({ subtotal: 450, service: 54, vat: 70.56, total: 574.56 });
  });

  it('omits service for delivery but still calculates VAT', () => {
    expect(calculatePrice(makeOrder('delivery'), menu)).toEqual({ subtotal: 450, service: 0, vat: 63, total: 513 });
  });
});