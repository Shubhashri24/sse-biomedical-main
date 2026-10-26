"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface RFQItem {
  productId?: string;
  productCode: string;
  equipmentName: string;
  category?: string;
  quantity: number;
}

interface RFQContextType {
  items: RFQItem[];
  addItem: (
    item: {
      productId?: string;
      productCode: string;
      equipmentName: string;
      category?: string;
    },
    quantity?: number
  ) => void;
  removeItem: (productCode: string) => void;
  updateQuantity: (productCode: string, quantity: number) => void;
  clearRFQ: () => void;
  totalCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const RFQContext = createContext<RFQContextType | undefined>(undefined);

const STORAGE_KEY = "sse_rfq_items_v1";

export function RFQProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RFQItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore localStorage errors
    }
    return [];
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items]);

  function addItem(
    newItem: {
      productId?: string;
      productCode: string;
      equipmentName: string;
      category?: string;
    },
    quantity: number = 1
  ) {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productCode.toUpperCase() === newItem.productCode.toUpperCase()
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: newItem.productId,
          productCode: newItem.productCode,
          equipmentName: newItem.equipmentName,
          category: newItem.category,
          quantity: Math.max(1, quantity),
        },
      ];
    });
    setIsDrawerOpen(true);
  }

  function removeItem(productCode: string) {
    setItems((prev) =>
      prev.filter((i) => i.productCode.toUpperCase() !== productCode.toUpperCase())
    );
  }

  function updateQuantity(productCode: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productCode);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productCode.toUpperCase() === productCode.toUpperCase()
          ? { ...i, quantity }
          : i
      )
    );
  }

  function clearRFQ() {
    setItems([]);
  }

  const totalCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <RFQContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearRFQ,
        totalCount,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        toggleDrawer: () => setIsDrawerOpen((v) => !v),
      }}
    >
      {children}
    </RFQContext.Provider>
  );
}

export function useRFQ() {
  const context = useContext(RFQContext);
  if (!context) {
    throw new Error("useRFQ must be used within an RFQProvider");
  }
  return context;
}
