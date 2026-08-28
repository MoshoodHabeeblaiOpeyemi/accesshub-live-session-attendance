// 1. IMPORT FIREBASE TOOLS 🧰
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. YOUR FIREBASE CONFIGURATION 🔗
const firebaseConfig = {
  apiKey: "AIzaSyCOxB2OXsTD5m4KCHbxFNhWIjn_3JiZZHU",
  authDomain: "attendance-82604.firebaseapp.com",
  projectId: "attendance-82604",
  storageBucket: "attendance-82604.firebasestorage.app",
  messagingSenderId: "684977293672",
  appId: "1:684977293672:web:8c57936adc38a48d032edd"
};

// 3. INITIALIZE FIREBASE 🚀
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. GRAB UI ELEMENTS 🎯
const form = document.getElementById("studentCheckInForm");
const checkInBtn = document.getElementById("checkInBtn");
const studentLoginSection = document.getElementById("studentLoginSection");
const heroText = document.querySelector(".hero p");

// ==========================================
// 🛡️ BULLETPROOF CHECK-IN LOGIC
// ==========================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Grab what the student typed (Now including NAME!) 📝📛
  const name = document.getElementById("studentName").value.trim();
  const email = document.getElementById("studentEmail").value.trim().toLowerCase();
  const code = document.getElementById("liveAccessCode").value.trim();

  checkInBtn.textContent = "Verifying... ⏳";
  checkInBtn.disabled = true;

  try {
    const sessionRef = doc(db, "sessions", "active");
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists() || !sessionSnap.data().isOpen) {
      alert("❌ There is no active class currently open. Please wait for your instructor.");
      resetButton();
      return;
    }

    if (sessionSnap.data().code !== code) {
      alert("❌ Invalid Access Code! Please check the code and try again.");
      resetButton();
      return;
    }

    const q = query(collection(db, "live_attendees"), where("email", "==", email), where("sessionCode", "==", code));
    const duplicateCheck = await getDocs(q);

    if (!duplicateCheck.empty) {
      alert("⚠️ You have already checked in for this session!");
      resetButton();
      return;
    }

    // SUCCESS! Write the student's NAME and email to the database ✅
    await addDoc(collection(db, "live_attendees"), {
      name: name, // 👈 New Name Field!
      email: email,
      sessionCode: code,
      timestamp: new Date().toISOString()
    });

    studentLoginSection.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <h2 style="font-size: 5rem; margin-bottom: 20px; animation: fadeIn 0.5s ease;">✅</h2>
        <h3 style="color: var(--teal); margin-bottom: 10px; font-size: 1.5rem;">You're in, ${name}!</h3>
        <p style="color: var(--muted); margin-bottom: 25px;">Your attendance has been securely recorded. You can now close this page or return to the webinar.</p>
        
        <!-- 👈 NEW RESET BUTTON -->
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

// Helper function to reset the button if something goes wrong 🔄
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