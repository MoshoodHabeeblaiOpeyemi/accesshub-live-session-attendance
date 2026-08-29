// 1. IMPORT FIREBASE TOOLS 🧰
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
// 🛡️ MULTI-TENANT CHECK-IN LOGIC
// ==========================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("studentName").value.trim();
  const email = document.getElementById("studentEmail").value.trim().toLowerCase();
  const code = document.getElementById("liveAccessCode").value.trim();

  checkInBtn.textContent = "Verifying... ⏳";
  checkInBtn.disabled = true;

  try {
    // 1. Search across all instructor sessions to find the one matching this live code & isOpen: true 🔍
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

    // Grab the specific instructor session data! 🏢
    const sessionDoc = sessionSnapshot.docs[0];
    const sessionData = sessionDoc.data();
    const instructorId = sessionData.instructorId;

    // 2. ANTI-CHEAT: Did this student already check in for THIS specific session? 🛑
    const duplicateQuery = query(
      collection(db, "live_attendees"), 
      where("instructorId", "==", instructorId),
      where("sessionCode", "==", code),
      where("email", "==", email)
    );
    const duplicateCheck = await getDocs(duplicateQuery);

    if (!duplicateCheck.empty) {
      alert("⚠️ You have already checked in for this session!");
      resetButton();
      return;
    }

    // 3. SUCCESS! Write the attendee record tied to this instructor's ID ✅
    await addDoc(collection(db, "live_attendees"), {
      instructorId: instructorId,
      name: name,
      email: email,
      sessionCode: code,
      timestamp: new Date().toISOString()
    });

    // 4. Update UI with success card and reset option 🎉
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