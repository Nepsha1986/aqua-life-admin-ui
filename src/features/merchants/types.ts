export type Merchant = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMerchantInput = {
  name: string;
  email: string;
};

export type UpdateMerchantInput = Partial<CreateMerchantInput>;
