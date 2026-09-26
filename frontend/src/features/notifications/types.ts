export interface InventoryNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  category: 'low_stock' | 'delivery' | 'receipt' | 'transfer' | 'system';
  title: string;
  message: string;
  timestamp: string;
  link?: string;
  actionLabel?: string;
  read?: boolean;
}

export interface NotificationsResponse {
  success: boolean;
  count: number;
  unreadCount: number;
  data: InventoryNotification[];
}
