const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.checkBudgetAlert = functions.firestore
    .document('wallets_v4/{userId}')
    .onUpdate((change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();
        
        // Calcular totales
        const totalExpenses = (newData.expenses || []).reduce((acc, curr) => acc + (Number(curr.amt) || 0), 0);
        const prevTotal = (previousData.expenses || []).reduce((acc, curr) => acc + (Number(curr.amt) || 0), 0);
        const salary = Number(newData.salary) || 0;
        const threshold = salary * 0.9; // 90% del sueldo
        
        // Lógica: Si supera el 90% AHORA y ANTES no lo superaba (para evitar alertas repetidas)
        if (salary > 0 && totalExpenses > threshold && prevTotal <= threshold) {
            // Aquí podrías enviar un email o escribir en una colección de 'notificaciones'
            console.log(`ALERTA CRÍTICA: El usuario ${context.params.userId} ha superado el 90% de su presupuesto.`);
        }
        
        return null;
    });