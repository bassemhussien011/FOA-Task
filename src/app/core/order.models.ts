export const ORDER_STATUSES = ['new', 'preparing', 'ready', 'served'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface OrderLine {
  menuId: string;
  qty: number;
  note: string;
}

export interface Order {
  id: string;
  number: number;
  type: OrderType;
  table: number | null;
  phone: string | null;
  status: OrderStatus;
  createdAt: string;
  items: OrderLine[];
}

export interface OrderDraft {
  number: number;
  type: OrderType;
  table: number | null;
  phone: string | null;
  status: 'new';
  createdAt: string;
  items: OrderLine[];
}

export interface PriceBreakdown {
  subtotal: number;
  service: number;
  vat: number;
  total: number;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePrice(order: Order | OrderDraft, menu: MenuItem[]): PriceBreakdown {
  const subtotal = roundCurrency(order.items.reduce((sum, line) => {
    const item = menu.find((entry) => entry.id === line.menuId);
    return sum + (item?.price ?? 0) * line.qty;
  }, 0));
  const service = roundCurrency(order.type === 'dine-in' ? subtotal * 0.12 : 0);
  const vat = roundCurrency((subtotal + service) * 0.14);
  return { subtotal, service, vat, total: roundCurrency(subtotal + service + vat) };
}

export function formatEgp(value: number): string {
  return new Intl.NumberFormat('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}