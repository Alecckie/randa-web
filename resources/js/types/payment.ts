export interface Payment {
    id: number;
    rider_id: number;
    amount: string;
    type: 'daily_payment' | 'bonus' | 'withdrawal';
    status: 'pending' | 'completed' | 'failed';
    payment_date: string;
    mpesa_transaction_id?: string;
    notes?: string;
}