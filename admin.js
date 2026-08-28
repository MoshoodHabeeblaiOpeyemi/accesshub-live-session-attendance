// 1. IMPORT FIREBASE TOOLS 🧰
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// 4. GRAB UI ELEMENTS 🎯
const adminLoginSection = document.getElementById("adminLoginSection");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminDashboard = document.getElementById("adminDashboard");

const generateCodeBtn = document.getElementById("generateCodeBtn");
const activeSessionDiv = document.getElementById("activeSessionDiv");
const liveCodeDisplay = document.getElementById("liveCode");
const closeSessionBtn = document.getElementById("closeSessionBtn");

const liveCount = document.getElementById("liveCount");
const adminAttendeeList = document.getElementById("adminAttendeeList");
const toastContainer = document.getElementById("toastContainer");

// Global variables to track the active session
let currentLiveCode = "";
let knownAttendees = new Set(); // To prevent duplicate toasts!

// ==========================================
// 🔐 SECURITY GATE: LOGIN LOGIC
// ==========================================
adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  adminLoginBtn.textContent = "Authenticating... ⏳";
  adminLoginBtn.disabled = true;

  try {
    // Talk to Google servers to verify this admin! 🛡️
    await signInWithEmailAndPassword(auth, email, password);
    
    // Success! Hide login, reveal the Command Center 🎛️
    adminLoginSection.style.display = "none";
    adminDashboard.style.display = "block";
    
  } catch (error) {
    console.error("Login Failed:", error);
    alert("❌ Invalid Admin Credentials! Intruder alert!");
    adminLoginBtn.textContent = "Secure Login 🛡️";
    adminLoginBtn.disabled = false;
  }
});

// ==========================================
// 🚀 OPEN CLASS: GENERATE CODE LOGIC
// ==========================================
generateCodeBtn.addEventListener("click", async () => {
  // Generate a random 4-digit code (e.g., 4921)
  currentLiveCode = Math.floor(1000 + Math.random() * 9000).toString();
  
  generateCodeBtn.textContent = "Opening Class... ⏳";
  generateCodeBtn.disabled = true;

  try {
    // Save this active session to Firebase! 🗄️
    await setDoc(doc(db, "sessions", "active"), {
      code: currentLiveCode,
      isOpen: true,
      createdAt: new Date().toISOString()
    });

    // Update UI 🎨
    generateCodeBtn.style.display = "none";
    activeSessionDiv.style.display = "block";
    liveCodeDisplay.textContent = currentLiveCode;

    // Start listening for students checking in! 👀
    startLiveListener();

  } catch (error) {
    console.error("Error creating session:", error);
    alert("⚠️ Could not open class. Check connection.");
    generateCodeBtn.textContent = "Open Class & Generate Code 🚀";
    generateCodeBtn.disabled = false;
  }
});

// ==========================================
// 👀 REAL-TIME LISTENER & TOAST LOGIC
// ==========================================
function startLiveListener() {
  const q = query(collection(db, "live_attendees"), where("sessionCode", "==", currentLiveCode));
  
  onSnapshot(q, (snapshot) => {
    // 1. Update the giant counter 📈
    liveCount.textContent = snapshot.size;
    
    adminAttendeeList.innerHTML = "";
    if (snapshot.empty) {
      adminAttendeeList.innerHTML = '<p id="emptyState" style="text-align: center; color: var(--muted);">Waiting for students to join...</p>';
    }

    // 2. Loop through every checked-in student
    snapshot.forEach((doc) => {
      const student = doc.data();
      
      // Add them to the visual roster with their NAME and email! 📋📛
      const li = document.createElement("li");
      li.innerHTML = `<span>${student.name}</span> <span style="color: var(--muted); font-size: 0.9em; font-weight: normal; margin-left: auto;">${student.email}</span>`;
      adminAttendeeList.appendChild(li);

      // 3. Trigger a Toast if this is a brand NEW student! 🍞💨
      if (!knownAttendees.has(student.email)) {
        knownAttendees.add(student.email);
        triggerToast(student.name, student.email);
      }
    });
  });
}

// The Toast Animation Function ✨
function triggerToast(name, email) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div style="font-size: 2rem;">👋</div> 
    <div>
      <div style="color: var(--teal); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">New Check-In</div>
      <strong style="font-size: 1.1rem; color: var(--navy);">${name}</strong><br>
      <small style="color: var(--muted);">${email}</small>
    </div>
  `;
  
  toastContainer.appendChild(toast);

  // Make it disappear after 5 seconds 💨
  setTimeout(() => {
    toast.style.animation = "slideOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards";
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// ==========================================
// 📥 CLOSE CLASS & EXPORT CSV LOGIC
// ==========================================
closeSessionBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to close the class? No more students will be able to join.")) return;

  closeSessionBtn.textContent = "Exporting... ⏳";
  closeSessionBtn.disabled = true;

  try {
    // 1. Lock the session in Firebase so no one else can join 🔒
    await setDoc(doc(db, "sessions", "active"), { isOpen: false }, { merge: true });

    // 2. Gather all the students to build the CSV (including Names!) 📊
    let csvContent = "data:text/csv;charset=utf-8,Status,Name,Email,Time\n";
    
    const q = query(collection(db, "live_attendees"), where("sessionCode", "==", currentLiveCode));
    const snapshot = await getDocs(q);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const time = new Date(data.timestamp).toLocaleTimeString();
      csvContent += `Present,${data.name},${data.email},${time}\n`;
    });

    // 3. Trigger the magic download! 📥
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${currentLiveCode}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    // 4. Reset UI
    alert("✅ Class Closed and CSV Exported!");
    closeSessionBtn.textContent = "Session Closed 🔒";

  } catch (error) {
    console.error("Error exporting:", error);
    alert("⚠️ Error exporting CSV.");
    closeSessionBtn.disabled = false;
  }
});