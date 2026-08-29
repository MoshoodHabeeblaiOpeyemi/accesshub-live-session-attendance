// 1. IMPORT FIREBASE TOOLS 🧰
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. YOUR FIREBASE CONFIGURATION 🔗
const firebaseConfig = {
  apiKey: "AIzaSyCOxB2OXsTD5m4KCHbxFNhWIjn_3JiZZHU",
  authDomain: "attendance-82604.firebaseapp.com",
  projectId: "attendance-82604",
  storageBucket: "attendance-82604.firebasestorage.app",
  messagingSenderId: "684977293672",
  appId: "1:684977293672:web:8c57936adc38a48d032edd"
};

// 3. INITIALIZE FIREBASE & OFFLINE PERSISTENCE 🚀💾
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// 4. GRAB UI ELEMENTS 🎯
const form = document.getElementById("studentCheckInForm");
const checkInBtn = document.getElementById("checkInBtn");
const studentLoginSection = document.getElementById("studentLoginSection");
const heroText = document.querySelector(".hero p");

// ==========================================
// 🛡️ BULLETPROOF MULTI-TENANT CHECK-IN LOGIC
// ==========================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // ⏱️ RATE LIMITER: Prevent spamming check-ins (5-second cooldown) ⏱️
  const lastAttempt = localStorage.getItem("last_checkin_attempt");
  const now = Date.now();
  if (lastAttempt && now - lastAttempt < 5000) {
    alert("⏳ Please wait a few seconds before trying again.");
    resetButton();
    return;
  }
  localStorage.setItem("last_checkin_attempt", now);

  const nameInput = document.getElementById("studentName");
  const emailInput = document.getElementById("studentEmail");
  const codeInput = document.getElementById("liveAccessCode");

  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const code = codeInput.value.trim();

  // 1. STRICT FORMAT VALIDATION 🔍
  
  // Name Check: 2 to 50 characters, letters, spaces, hyphens, and apostrophes only 📛
  const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
  if (!nameRegex.test(name)) {
    alert("❌ Please enter a valid full name (letters and spaces only, 2-50 characters).");
    nameInput.focus();
    resetButton();
    return;
  }

  // Email Check: Standard email format regex 📧
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("❌ Please enter a valid email address (e.g., student@example.com).");
    emailInput.focus();
    resetButton();
    return;
  }

  // Code Check: Strictly 4 digits 🔢
  const codeRegex = /^\d{4}$/;
  if (!codeRegex.test(code)) {
    alert("❌ Invalid Access Code format. The live code must be exactly 4 digits.");
    codeInput.focus();
    resetButton();
    return;
  }

  checkInBtn.textContent = "Verifying... ⏳";
  checkInBtn.disabled = true;

  try {
    // 2. SEARCH ACTIVE SESSIONS 🏢
    const sessionsQuery = query(
      collection(db, "sessions"), 
      where("code", "==", code),
      where("isOpen", "==", true)
    );
    const sessionSnapshot = await getDocs(sessionsQuery);

    if (sessionSnapshot.empty) {
      alert("❌ Invalid Access Code or the class is currently closed. Please check the code with your instructor.");
      resetButton();
      return;
    }

    const sessionDoc = sessionSnapshot.docs[0];
    const sessionData = sessionDoc.data();
    const instructorId = sessionData.instructorId;

    // Optional: Auto-expiry check (Reject sessions older than 3 hours) ⏰
    const threeHoursAgo = new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString();
    if (sessionData.createdAt && sessionData.createdAt < threeHoursAgo) {
      alert("❌ This active session has expired. Please ask your instructor for a fresh code.");
      resetButton();
      return;
    }

    // 3. AIRTIGHT ANTI-DUPLICATE CHECK (Can someone register twice? NOPE! 🛑)
    const duplicateQuery = query(
      collection(db, "live_attendees"), 
      where("instructorId", "==", instructorId),
      where("sessionCode", "==", code),
      where("email", "==", email)
    );
    const duplicateCheck = await getDocs(duplicateQuery);

    if (!duplicateCheck.empty) {
      alert("⚠️ You have already checked in for this session using this email address!");
      resetButton();
      return;
    }

    // 4. SECURE WRITE TO DATABASE ✅
    await addDoc(collection(db, "live_attendees"), {
      instructorId: instructorId,
      name: name,
      email: email,
      sessionCode: code,
      timestamp: new Date().toISOString()
    });

    // 5. SUCCESS UI & RESET OPTION 🎉
    studentLoginSection.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <h2 style="font-size: 5rem; margin-bottom: 20px; animation: fadeIn 0.5s ease;">✅</h2>
        <h3 style="color: var(--teal); margin-bottom: 10px; font-size: 1.5rem;">You're in, ${name}!</h3>
        <p style="color: var(--muted); margin-bottom: 25px;">Your attendance has been securely recorded. You can now close this page or return to the webinar.</p>
        
        <button onclick="location.reload();" style="max-width: 250px; margin: 0 auto; background: var(--navy);">
          Back to Check-In 🔄
        </button>
      </div>
    `;
    heroText.textContent = "Attendance successfully verified. Enjoy the class!";

  } catch (error) {
    console.error("Check-in error:", error);
    alert("⚠️ Connection error. Please check your internet and try again.");
    resetButton();
  }
});

function resetButton() {
  checkInBtn.textContent = "Mark Me Present ✅";
  checkInBtn.disabled = false;
}

// 🤖 Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registered! Scope:', reg.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}