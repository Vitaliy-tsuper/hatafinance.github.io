
'use client';

import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import SpendingReport from '@/components/SpendingReport';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase'; 
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, addDoc, deleteDoc, doc, Timestamp, getDoc } from 'firebase/firestore'; // Firestore imports


export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("[page.tsx] Auth state changed. User:", user ? user.email : 'No user');
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!auth.currentUser || !auth.currentUser.email) {
      console.log("[page.tsx] Fetch transactions: No current user or email, clearing transactions.");
      setTransactions([]);
      setLoading(false);
      return;
    }
    console.log("[page.tsx] Fetching transactions for user:", auth.currentUser.email);
    setLoading(true);
    try {
      const q = query(
        collection(db, "transactions"),
        where("userEmail", "==", auth.currentUser.email),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedTransactions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(), // Convert Firestore Timestamp to JS Date
        } as Transaction;
      });
      console.log("[page.tsx] Fetched transactions count:", fetchedTransactions.length);
      setTransactions(fetchedTransactions);
    } catch (error: any) {
      console.error("[page.tsx] Failed to fetch transactions (client-side):", error);
      toast({
        title: "Помилка завантаження!",
        description: `Не вдалося завантажити транзакції: ${error.message} (Code: ${error.code})`,
        variant: "destructive",
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]); 

  useEffect(() => {
    if (auth.currentUser) { 
      fetchTransactions();
    } else if (!authLoading) {
      console.log("[page.tsx] No current user after auth loading, clearing transactions.");
      setTransactions([]);
      setLoading(false);
    }
  }, [auth.currentUser, authLoading, fetchTransactions]); 


  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'userEmail'>) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      toast({ title: "Помилка", description: "Будь ласка, увійдіть, щоб додати транзакцію.", variant: "destructive" });
      return;
    }
    // Log the currentUser.email from auth state and directly from auth.currentUser for comparison
    console.log("[page.tsx] handleAddTransaction called. currentUser.email (from state):", currentUser?.email, "auth.currentUser.email (direct):", auth.currentUser.email);

    const dataToSend = {
      ...transactionData,
      date: Timestamp.fromDate(new Date(transactionData.date)), // Ensure date is Firestore Timestamp
      amount: Number(transactionData.amount),
      userEmail: auth.currentUser.email, // Use email directly from auth.currentUser
    };
    console.log("[page.tsx] Data to send to Firestore:", dataToSend);

    try {
      const docRef = await addDoc(collection(db, "transactions"), dataToSend);
      // Immediately refetch transactions to update the list
      await fetchTransactions(); 
      toast({
        title: "Успіх!",
        description: "Вашу транзакцію записано.",
      });
    } catch (error: any) {
      console.error("[page.tsx] Failed to add transaction to Firestore (client-side). Full error object:", error);
      toast({
        title: "Помилка!",
        description: `Не вдалося додати транзакцію: ${error.message} (Code: ${error.code})`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      toast({ title: "Помилка", description: "Будь ласка, увійдіть, щоб видалити транзакцію.", variant: "destructive" });
      return;
    }
    // Log the currentUser.email from auth state and directly from auth.currentUser for comparison
    console.log(`[page.tsx] handleDeleteTransaction called for ID: ${id}. currentUser.email (from state):`, currentUser?.email, "auth.currentUser.email (direct):", auth.currentUser.email);

    try {
      const transactionRef = doc(db, "transactions", id);
      const transactionSnap = await getDoc(transactionRef);

      if (!transactionSnap.exists()) {
        toast({ title: "Помилка!", description: "Транзакцію не знайдено.", variant: "destructive" });
        return;
      }

      // Use email directly from auth.currentUser for the check
      if (transactionSnap.data().userEmail !== auth.currentUser.email) {
        toast({ title: "Помилка!", description: "Ви можете видаляти лише власні транзакції.", variant: "destructive" });
        return;
      }

      await deleteDoc(transactionRef);
      // Immediately refetch transactions to update the list
      await fetchTransactions();
      toast({
        title: "Успіх!",
        description: "Транзакцію видалено.",
      });
    } catch (error: any) {
      console.error("[page.tsx] Error deleting transaction (client-side):", error);
      toast({
        title: "Помилка!",
        description: `Не вдалося видалити транзакцію: ${error.message}`,
        variant: "destructive",
      });
    }
  };


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Ви вийшли', description: 'До зустрічі!' });
      router.push('/login');
    } catch (error: any) {
      toast({ title: 'Помилка виходу', description: error.message, variant: 'destructive' });
    }
  };

  const calculateBalance = () => {
    if (!Array.isArray(transactions)) {
      return 0;
    }
    return transactions.reduce((balance, transaction) => balance + Number(transaction.amount), 0);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl text-muted-foreground">Завантаження...</p>
      </div>
    );
  }

  const balance = calculateBalance();
  const incomeTransactions = transactions.filter(t => Number(t.amount) > 0);
  const expenseTransactions = transactions.filter(t => Number(t.amount) < 0);


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-2">
           <Image src="/logo.png" alt="HataFinance Logo" width={48} height={48} className="mr-3 rounded-full shadow-md" data-ai-hint="piggy bank" />
          <h1 className="text-4xl font-bold tracking-tight text-primary">HataFinance</h1>
        </div>
        <p className="text-muted-foreground">Ваш персональний фінансовий помічник</p>
         {currentUser && (
          <div className="mt-4 flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">Вітаємо, {currentUser.email}</p>
            <div className="flex space-x-2">
                <Link href="/change-password" passHref>
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Змінити пароль
                    </Button>
                </Link>
                <Button variant="ghost" onClick={handleLogout} className="text-primary" size="sm">Вийти</Button>
            </div>
          </div>
        )}
      </header>

      {!currentUser ? (
        <Card className="text-center p-8 shadow-xl border-accent">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl mb-2 text-accent-foreground">Ласкаво просимо до HataFinance!</CardTitle>
             <CardDescription className="mb-6 text-lg">
              Будь ласка, увійдіть або зареєструйтеся, щоб почати керувати своїми фінансами.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center space-x-4">
              <Link href="/login" passHref>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">Увійти</Button>
              </Link>
              <Link href="/signup" passHref>
                <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/10">Зареєструватися</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-8 shadow-xl border-accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-2xl font-semibold text-accent-foreground">Поточний баланс</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className={`text-5xl font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                 ₴{balance.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="text-xl">Додати транзакцію</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionForm onTransactionAdded={handleAddTransaction} />
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Витрати</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground">Завантаження витрат...</p>
                  ) : (
                    <TransactionList
                      transactions={expenseTransactions}
                      type="expenses"
                      onTransactionDeleted={handleDeleteTransaction}
                     />
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Доходи</CardTitle>
                </CardHeader>
                <CardContent>
                   {loading ? (
                    <p className="text-muted-foreground">Завантаження доходів...</p>
                  ) : (
                    <TransactionList
                       transactions={incomeTransactions}
                       type="income"
                       onTransactionDeleted={handleDeleteTransaction}
                     />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Звіт про витрати</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                    <p className="text-muted-foreground">Завантаження звіту...</p>
                ) : (
                  <SpendingReport transactions={expenseTransactions} />
                 )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
       <Toaster />
    </div>
  );
}
