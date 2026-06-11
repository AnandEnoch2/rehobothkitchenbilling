import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Product {
  id: string;
  name: string;
  rate: number;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  rate: number;
  quantity: number;
}

export type PaymentMethod = "cash" | "online" | "credit";

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  timestamp: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  timestamp: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: "credit" | "payment";
  date: string;
  timestamp: number;
}

export interface CustomerCredit {
  id: string;
  customerName: string;
  mobile?: string;
  transactions: CreditTransaction[];
}

export interface User {
  username: string;
  role: "admin" | "staff";
}

const USERS = [
  { username: "admin", password: "admin123", role: "admin" as const },
  { username: "rehobothkitchen", password: "rehoboth@2026", role: "staff" as const },
];

const DEFAULT_PRODUCTS: Product[] = [
  { id: "p1", name: "Rice (Full)", rate: 60, category: "Rice Items" },
  { id: "p2", name: "Rice (Half)", rate: 35, category: "Rice Items" },
  { id: "p3", name: "Chicken Curry", rate: 120, category: "Non-Veg" },
  { id: "p4", name: "Egg Curry", rate: 80, category: "Non-Veg" },
  { id: "p5", name: "Fish Fry", rate: 150, category: "Non-Veg" },
  { id: "p6", name: "Dal Fry", rate: 60, category: "Veg" },
  { id: "p7", name: "Paneer Butter Masala", rate: 110, category: "Veg" },
  { id: "p8", name: "Roti", rate: 15, category: "Breads" },
  { id: "p9", name: "Parotta", rate: 20, category: "Breads" },
  { id: "p10", name: "Cold Drinks", rate: 40, category: "Beverages" },
  { id: "p11", name: "Tea", rate: 15, category: "Beverages" },
  { id: "p12", name: "Water Bottle", rate: 20, category: "Beverages" },
];

interface AppContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => Promise<void>;

  products: Product[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, "id">>) => void;
  removeProduct: (id: string) => void;

  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;

  pendingBill: CartItem[] | null;
  setPendingBill: (items: CartItem[] | null) => void;

  sales: Sale[];
  addSale: (
    items: CartItem[],
    paymentMethod: PaymentMethod,
    customerName?: string,
    discount?: number
  ) => Sale;

  expenses: Expense[];
  addExpense: (description: string, amount: number) => void;
  removeExpense: (id: string) => void;
  getExpensesForDate: (dateStr: string) => Expense[];

  credits: CustomerCredit[];
  addCreditPayment: (customerId: string, amount: number) => void;
  updateCustomerMobile: (customerId: string, mobile: string) => void;

  getDateStr: (date?: Date) => string;
  getTodayStats: () => {
    cash: number; online: number; credit: number;
    total: number; discount: number; expenses: number; net: number;
  };
  getSalesForDate: (dateStr: string) => Sale[];
  getLast7DaysRevenue: () => { label: string; date: string; gross: number; net: number }[];
  getTotalOutstandingCredit: () => number;
  getCustomerBalance: (customerId: string) => number;

  exportBackup: () => string;
  importBackup: (json: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const genId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingBill, setPendingBill] = useState<CartItem[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [pStr, sStr, cStr, uStr, eStr] = await Promise.all([
          AsyncStorage.getItem("products"),
          AsyncStorage.getItem("sales"),
          AsyncStorage.getItem("credits"),
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("expenses"),
        ]);
        setProducts(pStr ? JSON.parse(pStr) : DEFAULT_PRODUCTS);
        setSales(sStr ? JSON.parse(sStr) : []);
        setCredits(cStr ? JSON.parse(cStr) : []);
        setExpenses(eStr ? JSON.parse(eStr) : []);
        if (uStr) setUser(JSON.parse(uStr));
        if (!pStr) await AsyncStorage.setItem("products", JSON.stringify(DEFAULT_PRODUCTS));
      } catch {
        setProducts(DEFAULT_PRODUCTS);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const saveProducts = useCallback(async (p: Product[]) => {
    setProducts(p);
    await AsyncStorage.setItem("products", JSON.stringify(p));
  }, []);

  const saveSales = useCallback(async (s: Sale[]) => {
    setSales(s);
    await AsyncStorage.setItem("sales", JSON.stringify(s));
  }, []);

  const saveExpenses = useCallback(async (e: Expense[]) => {
    setExpenses(e);
    await AsyncStorage.setItem("expenses", JSON.stringify(e));
  }, []);

  const saveCredits = useCallback(async (c: CustomerCredit[]) => {
    setCredits(c);
    await AsyncStorage.setItem("credits", JSON.stringify(c));
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const found = USERS.find((u) => u.username === username && u.password === password);
    if (found) {
      const u: User = { username: found.username, role: found.role };
      setUser(u);
      AsyncStorage.setItem("user", JSON.stringify(u));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("user");
    setUser(null);
    setCart([]);
    setPendingBill(null);
  }, []);

  const addProduct = useCallback(
    (product: Omit<Product, "id">) => {
      saveProducts([...products, { ...product, id: genId() }]);
    },
    [products, saveProducts]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Omit<Product, "id">>) => {
      saveProducts(products.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    [products, saveProducts]
  );

  const removeProduct = useCallback(
    (id: string) => saveProducts(products.filter((p) => p.id !== id)),
    [products, saveProducts]
  );

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing)
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (existing && existing.quantity > 1)
        return prev.map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c
        );
      return prev.filter((c) => c.product.id !== productId);
    });
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((c) => c.product.id !== productId);
      return prev.map((c) =>
        c.product.id === productId ? { ...c, quantity: qty } : c
      );
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.rate * item.quantity,
    0
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getDateStr = useCallback((date?: Date) => {
    const d = date ?? new Date();
    return d.toISOString().split("T")[0];
  }, []);

  const addSale = useCallback(
    (
      items: CartItem[],
      paymentMethod: PaymentMethod,
      customerName?: string,
      discount = 0
    ): Sale => {
      const now = new Date();
      const subtotal = items.reduce(
        (s, ci) => s + ci.product.rate * ci.quantity,
        0
      );
      const total = Math.max(0, subtotal - discount);
      const sale: Sale = {
        id: genId(),
        date: getDateStr(now),
        items: items.map((ci) => ({
          productId: ci.product.id,
          name: ci.product.name,
          rate: ci.product.rate,
          quantity: ci.quantity,
        })),
        subtotal,
        discount,
        total,
        paymentMethod,
        customerName: paymentMethod === "credit" ? customerName : undefined,
        timestamp: now.getTime(),
      };
      saveSales([...sales, sale]);
      if (paymentMethod === "credit" && customerName) {
        const existing = credits.find(
          (c) =>
            c.customerName.toLowerCase() === customerName.toLowerCase()
        );
        const tx: CreditTransaction = {
          id: genId(),
          amount: total,
          type: "credit",
          date: getDateStr(now),
          timestamp: now.getTime(),
        };
        if (existing) {
          saveCredits(
            credits.map((c) =>
              c.id === existing.id
                ? { ...c, transactions: [...c.transactions, tx] }
                : c
            )
          );
        } else {
          saveCredits([
            ...credits,
            { id: genId(), customerName, transactions: [tx] },
          ]);
        }
      }
      return sale;
    },
    [sales, credits, saveSales, saveCredits, getDateStr]
  );

  const addExpense = useCallback(
    (description: string, amount: number) => {
      const now = new Date();
      const expense: Expense = {
        id: genId(),
        description,
        amount,
        date: getDateStr(now),
        timestamp: now.getTime(),
      };
      saveExpenses([...expenses, expense]);
    },
    [expenses, saveExpenses, getDateStr]
  );

  const removeExpense = useCallback(
    (id: string) => saveExpenses(expenses.filter((e) => e.id !== id)),
    [expenses, saveExpenses]
  );

  const getExpensesForDate = useCallback(
    (dateStr: string) => expenses.filter((e) => e.date === dateStr),
    [expenses]
  );

  const addCreditPayment = useCallback(
    (customerId: string, amount: number) => {
      const now = new Date();
      const tx: CreditTransaction = {
        id: genId(),
        amount,
        type: "payment",
        date: getDateStr(now),
        timestamp: now.getTime(),
      };
      saveCredits(
        credits.map((c) =>
          c.id === customerId
            ? { ...c, transactions: [...c.transactions, tx] }
            : c
        )
      );
    },
    [credits, saveCredits, getDateStr]
  );

  const updateCustomerMobile = useCallback(
    (customerId: string, mobile: string) => {
      saveCredits(
        credits.map((c) => (c.id === customerId ? { ...c, mobile } : c))
      );
    },
    [credits, saveCredits]
  );

  const getTodayStats = useCallback(() => {
    const today = getDateStr();
    const todaySales = sales.filter((s) => s.date === today);
    const todayExpenses = expenses.filter((e) => e.date === today);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cash = todaySales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, s) => sum + s.total, 0);
    const online = todaySales
      .filter((s) => s.paymentMethod === "online")
      .reduce((sum, s) => sum + s.total, 0);
    const credit = todaySales
      .filter((s) => s.paymentMethod === "credit")
      .reduce((sum, s) => sum + s.total, 0);
    const total = todaySales.reduce((sum, s) => sum + s.total, 0);
    const discount = todaySales.reduce((sum, s) => sum + (s.discount ?? 0), 0);
    return {
      cash, online, credit, total, discount,
      expenses: totalExpenses, net: total - totalExpenses,
    };
  }, [sales, expenses, getDateStr]);

  const getSalesForDate = useCallback(
    (dateStr: string) => sales.filter((s) => s.date === dateStr),
    [sales]
  );

  const getLast7DaysRevenue = useCallback(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const date = getDateStr(d);
      const daySales = sales.filter((s) => s.date === date);
      const dayExpenses = expenses.filter((e) => e.date === date);
      const gross = daySales.reduce((sum, s) => sum + s.total, 0);
      const exp = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      return { label, date, gross, net: gross - exp };
    });
  }, [sales, expenses, getDateStr]);

  const getTotalOutstandingCredit = useCallback(() => {
    return credits.reduce((total, c) => {
      const balance = c.transactions.reduce(
        (sum, tx) =>
          tx.type === "credit" ? sum + tx.amount : sum - tx.amount,
        0
      );
      return total + (balance > 0 ? balance : 0);
    }, 0);
  }, [credits]);

  const getCustomerBalance = useCallback(
    (customerId: string) => {
      const c = credits.find((cr) => cr.id === customerId);
      if (!c) return 0;
      return c.transactions.reduce(
        (sum, tx) =>
          tx.type === "credit" ? sum + tx.amount : sum - tx.amount,
        0
      );
    },
    [credits]
  );

  const exportBackup = useCallback((): string => {
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      products,
      sales,
      expenses,
      credits,
    };
    return JSON.stringify(backup, null, 2);
  }, [products, sales, expenses, credits]);

  const importBackup = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (!data.version || !Array.isArray(data.products)) return false;
      const p = data.products ?? DEFAULT_PRODUCTS;
      const s = data.sales ?? [];
      const e = data.expenses ?? [];
      const c = data.credits ?? [];
      setProducts(p);
      setSales(s);
      setExpenses(e);
      setCredits(c);
      AsyncStorage.multiSet([
        ["products", JSON.stringify(p)],
        ["sales", JSON.stringify(s)],
        ["expenses", JSON.stringify(e)],
        ["credits", JSON.stringify(c)],
      ]);
      return true;
    } catch {
      return false;
    }
  }, []);

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        user, login, logout,
        products, addProduct, updateProduct, removeProduct,
        cart, addToCart, removeFromCart, updateQuantity, clearCart,
        cartTotal, cartCount,
        pendingBill, setPendingBill,
        sales, addSale,
        expenses, addExpense, removeExpense, getExpensesForDate,
        credits, addCreditPayment, updateCustomerMobile,
        getDateStr, getTodayStats, getSalesForDate, getLast7DaysRevenue,
        getTotalOutstandingCredit, getCustomerBalance,
        exportBackup, importBackup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
