/**
 * Transactional email service backed by the Laravel App API.
 */

import { post } from './client';
import type { SendEsimDeliveryEmailRequest } from './types';

const ENDPOINTS = {
  ESIM_DELIVERY: '/app/email/esim-delivery',
} as const;

export const emailService = {
  async sendEsimDelivery(data: SendEsimDeliveryEmailRequest): Promise<{ success: boolean; messageId: string }> {
    return post<{ success: boolean; messageId: string }>(ENDPOINTS.ESIM_DELIVERY, data);
  },
};

export default emailService;
