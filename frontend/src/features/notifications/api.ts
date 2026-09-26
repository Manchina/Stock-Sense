import { api } from '../../lib/api';
import { InventoryNotification, NotificationsResponse } from './types';
import { INITIAL_PRODUCTS, INITIAL_OPERATIONS } from '../../lib/constants';

function computeFallbackNotifications(): InventoryNotification[] {
  const notifs: InventoryNotification[] = [];

  // Generate fallback notifications from INITIAL_PRODUCTS
  for (const prod of INITIAL_PRODUCTS) {
    if (prod.currentStock === 0) {
      notifs.push({
        id: `notif-oos-${prod.id}`,
        type: 'error',
        category: 'low_stock',
        title: 'Out of Stock Alert',
        message: `${prod.name} (${prod.sku}) has 0 units remaining in stock. Safety threshold is ${prod.minStockAlert} ${prod.unitOfMeasure}.`,
        timestamp: new Date().toISOString(),
        link: `/products/${prod.id}`,
        actionLabel: 'View Product',
      });
    } else if (prod.currentStock <= prod.minStockAlert) {
      notifs.push({
        id: `notif-low-${prod.id}`,
        type: 'warning',
        category: 'low_stock',
        title: 'Low Stock Warning',
        message: `${prod.name} (${prod.sku}) has ${prod.currentStock} ${prod.unitOfMeasure} remaining, below safety threshold of ${prod.minStockAlert} ${prod.unitOfMeasure}.`,
        timestamp: new Date().toISOString(),
        link: `/products/${prod.id}`,
        actionLabel: 'Reorder Stock',
      });
    }
  }

  // Generate fallback alerts from INITIAL_OPERATIONS
  for (const op of INITIAL_OPERATIONS) {
    if (op.status === 'waiting' || op.status === 'ready') {
      if (op.type === 'delivery') {
        notifs.push({
          id: `notif-del-${op.id}`,
          type: 'info',
          category: 'delivery',
          title: op.status === 'ready' ? 'Delivery Ready for Dispatch' : 'Delivery Awaiting Pick & Pack',
          message: `Order #${op.documentNumber} is in ${op.status} status.`,
          timestamp: op.createdAt,
          link: `/operations/deliveries/${op.id}`,
          actionLabel: 'Review Order',
        });
      } else if (op.type === 'receipt') {
        notifs.push({
          id: `notif-rec-${op.id}`,
          type: 'info',
          category: 'receipt',
          title: 'Inbound Shipment Pending Intake',
          message: `Receipt #${op.documentNumber} is ${op.status}.`,
          timestamp: op.createdAt,
          link: `/operations/receipts/${op.id}`,
          actionLabel: 'Validate Goods',
        });
      } else if (op.type === 'internal') {
        notifs.push({
          id: `notif-trf-${op.id}`,
          type: 'info',
          category: 'transfer',
          title: 'Internal Transfer Scheduled',
          message: `Transfer #${op.documentNumber} is scheduled and awaiting execution.`,
          timestamp: op.createdAt,
          link: `/operations/transfers/${op.id}`,
          actionLabel: 'Process Move',
        });
      }
    }
  }

  return notifs;
}

export const notificationsApi = {
  getAll: async (): Promise<InventoryNotification[]> => {
    try {
      const res = await api.get<NotificationsResponse>('/dashboard/notifications');
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return computeFallbackNotifications();
    } catch (err) {
      console.warn('Could not fetch notifications from API, using fallback:', err);
      return computeFallbackNotifications();
    }
  },
};
