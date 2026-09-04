// ==========================================
// 🔥 FIREBASE IMPORTS
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


// ==========================================
// 🔗 FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyCOxB2OXsTD5m4KCHbxFNhWIjn_3JiZZHU",
  authDomain: "attendance-82604.firebaseapp.com",
  projectId: "attendance-82604",
  storageBucket: "attendance-82604.firebasestorage.app",
  messagingSenderId: "684977293672",
  appId: "1:684977293672:web:8c57936adc38a48d032edd"
};


// ==========================================
// 🚀 INITIALIZE FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);


// ==========================================
// 🎯 GRAB UI ELEMENTS
// ==========================================

const adminLoginSection =
  document.getElementById("adminLoginSection");

const adminLoginForm =
  document.getElementById("adminLoginForm");

const adminLoginBtn =
  document.getElementById("adminLoginBtn");

const adminDashboard =
  document.getElementById("adminDashboard");

const logoutBtn =
  document.getElementById("logoutBtn");


const authCardTitle =
  document.getElementById("authCardTitle");

const authSubtitle =
  document.getElementById("authSubtitle");

const nameFieldContainer =
  document.getElementById("nameFieldContainer");

const instructorNameInput =
  document.getElementById("instructorName");

const toggleText =
  document.getElementById("toggleText");

const authModeToggleBtn =
  document.getElementById("authModeToggleBtn");


const sessionTitleInput =
  document.getElementById("sessionTitle");

const sessionInputGroup =
  document.getElementById("sessionInputGroup");

const generateCodeBtn =
  document.getElementById("generateCodeBtn");

const activeSessionDiv =
  document.getElementById("activeSessionDiv");

const activeSessionTitleDisplay =
  document.getElementById("activeSessionTitleDisplay");

const liveCodeDisplay =
  document.getElementById("liveCode");

const closeSessionBtn =
  document.getElementById("closeSessionBtn");


const liveCount =
  document.getElementById("liveCount");

const adminAttendeeList =
  document.getElementById("adminAttendeeList");

const toastContainer =
  document.getElementById("toastContainer");

const modalOverlay =
  document.getElementById("modalOverlay");

const modalIcon =
  document.getElementById("modalIcon");

const modalTitle =
  document.getElementById("modalTitle");

const modalBody =
  document.getElementById("modalBody");

const modalFooter =
  document.getElementById("modalFooter");


// ==========================================
// 📦 GLOBAL STATES
// ==========================================

let isSignUpMode = false;

let currentLiveCode = "";

let currentSessionTitle = "";

let currentSessionId = "";

let knownAttendees = new Set();


// ==========================================
// 🔔 SHOW TOAST
// ==========================================
//
// type: "success" | "error" | "warning"
//

function showToast(message, type = "error") {

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️"
  };

  const toast = document.createElement("div");

  toast.className = `toast toast--${type}`;


  const icon = document.createElement("div");

  icon.style.fontSize = "1.6rem";

  icon.textContent = icons[type] ?? "ℹ️";


  const content = document.createElement("div");

  content.style.fontSize = "0.95rem";

  content.style.color = "var(--navy)";

  content.style.lineHeight = "1.5";

  content.textContent = message;


  toast.appendChild(icon);

  toast.appendChild(content);

  toastContainer.appendChild(toast);


  setTimeout(() => {

    toast.style.animation =
      "slideOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards";

    setTimeout(() => toast.remove(), 400);

  }, 4500);

}


// ==========================================
// 🪟 SHOW MODAL (alert style — one OK button)
// ==========================================

function showModal({ icon = "ℹ️", title, message }) {

  return new Promise((resolve) => {

    modalIcon.textContent = icon;

    modalTitle.textContent = title;

    modalBody.textContent = message;

    modalFooter.innerHTML = "";


    const okBtn = document.createElement("button");

    okBtn.textContent = "OK";

    okBtn.className = "modal-btn-confirm";

    okBtn.style.background = "var(--teal)";

    okBtn.addEventListener("click", () => {

      closeModal();

      resolve(true);

    });


    modalFooter.appendChild(okBtn);

    modalOverlay.classList.remove("hidden");

    okBtn.focus();

  });

}


// ==========================================
// 🪟 SHOW CONFIRM MODAL (two buttons)
// ==========================================
//
// Returns a Promise<boolean>:
//   true  = user clicked the confirm button
//   false = user clicked cancel or overlay
//

function showConfirm({ icon = "⚠️", title, message, confirmText = "Confirm", cancelText = "Cancel" }) {

  return new Promise((resolve) => {

    modalIcon.textContent = icon;

    modalTitle.textContent = title;

    modalBody.textContent = message;

    modalFooter.innerHTML = "";


    const cancelBtn = document.createElement("button");

    cancelBtn.textContent = cancelText;

    cancelBtn.className = "modal-btn-cancel";

    cancelBtn.addEventListener("click", () => {

      closeModal();

      resolve(false);

    });


    const confirmBtn = document.createElement("button");

    confirmBtn.textContent = confirmText;

    confirmBtn.className = "modal-btn-confirm";

    confirmBtn.addEventListener("click", () => {

      closeModal();

      resolve(true);

    });


    modalFooter.appendChild(cancelBtn);

    modalFooter.appendChild(confirmBtn);

    modalOverlay.classList.remove("hidden");

    confirmBtn.focus();

  });

}


// ==========================================
// 🔒 CLOSE MODAL
// ==========================================

function closeModal() {

  modalOverlay.classList.add("hidden");

  modalFooter.innerHTML = "";

}


// Close modal on overlay click (outside the box)
modalOverlay.addEventListener("click", (e) => {

  if (e.target === modalOverlay) {

    closeModal();

    // If a confirm was pending, treat backdrop
    // click as a cancel (resolve false)
    // — handled via the cancel button path above

  }

});


// ==========================================
// 🧠 AUTO-LOGIN MEMORY
// ==========================================

onAuthStateChanged(auth, async (user) => {

  if (user) {

    // User is logged in
    currentSessionId = user.uid;

    adminLoginSection.style.display = "none";

    adminDashboard.style.display = "block";

    logoutBtn.style.display = "inline-block";


    // Restore active session if one exists
    await restoreExistingSession(currentSessionId);

  } else {

    // User is logged out
    adminDashboard.style.display = "none";

    adminLoginSection.style.display = "block";

    logoutBtn.style.display = "none";

  }

});


// ==========================================
// 🔄 RESTORE EXISTING SESSION
// ==========================================

async function restoreExistingSession(instructorId) {

  try {

    const sessionDocRef = doc(
      db,
      "sessions",
      instructorId
    );


    const sessionSnap = await getDoc(sessionDocRef);


    if (sessionSnap.exists()) {

      const data = sessionSnap.data();


      // Restore only an active session
      if (data.isOpen === true) {

        currentLiveCode = data.code;

        currentSessionTitle = data.sessionTitle || "Live Session";


        sessionInputGroup.style.display = "none";

        generateCodeBtn.style.display = "none";

        activeSessionDiv.style.display = "block";


        activeSessionTitleDisplay.textContent =
          `📚 ${currentSessionTitle}`;


        liveCodeDisplay.textContent = currentLiveCode;


        // Restart live attendee listener
        startLiveListener();

      }

    }

  } catch (error) {

    console.error("Error restoring session:", error);

  }

}


// ==========================================
// 🔄 TOGGLE LOGIN / SIGN UP MODE
// ==========================================

authModeToggleBtn.addEventListener("click", () => {

  isSignUpMode = !isSignUpMode;


  if (isSignUpMode) {

    authCardTitle.textContent = "Instructor Sign Up 🚀";

    authSubtitle.textContent =
      "Create an account to host your own live attendance sessions.";

    nameFieldContainer.style.display = "block";

    instructorNameInput.required = true;

    adminLoginBtn.textContent = "Create Account ✨";

    toggleText.textContent = "Already have an account?";

    authModeToggleBtn.textContent = "Log in";

  } else {

    authCardTitle.textContent = "Instructor Portal 🔐";

    authSubtitle.textContent =
      "Authenticate to access your command center.";

    nameFieldContainer.style.display = "none";

    instructorNameInput.required = false;

    adminLoginBtn.textContent = "Secure Login 🛡️";

    toggleText.textContent = "New instructor?";

    authModeToggleBtn.textContent = "Create an account";

  }

});


// ==========================================
// 🔐 LOGIN / SIGN UP
// ==========================================

adminLoginForm.addEventListener("submit", async (e) => {

  e.preventDefault();


  const email =
    document.getElementById("adminEmail").value.trim();

  const password =
    document.getElementById("adminPassword").value.trim();

  const instructorName =
    instructorNameInput.value.trim();


  adminLoginBtn.textContent = isSignUpMode
    ? "Creating Account... ⏳"
    : "Authenticating... ⏳";

  adminLoginBtn.disabled = true;


  try {

    let userCredential;


    // ==========================================
    // CREATE ACCOUNT
    // ==========================================

    if (isSignUpMode) {

      if (!instructorName) {

        showToast("Please enter your name.", "error");

        instructorNameInput.focus();

        adminLoginBtn.textContent = "Create Account ✨";

        adminLoginBtn.disabled = false;

        return;

      }


      userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );


      // Create instructor profile
      await setDoc(

        doc(db, "instructors", userCredential.user.uid),

        {
          name: instructorName,
          email: email.toLowerCase(),
          createdAt: new Date().toISOString()
        }

      );


    // ==========================================
    // LOGIN
    // ==========================================

    } else {

      userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    }


    // onAuthStateChanged handles UI transition

  } catch (error) {

    console.error("Authentication failed:", error);


    // Map Firebase auth error codes to friendly messages
    const authErrors = {
      "auth/user-not-found":      "No account found with that email.",
      "auth/wrong-password":      "Incorrect password. Please try again.",
      "auth/invalid-credential":  "Incorrect email or password. Please try again.",
      "auth/email-already-in-use":"An account with this email already exists.",
      "auth/weak-password":       "Password must be at least 6 characters.",
      "auth/invalid-email":       "Please enter a valid email address.",
      "auth/too-many-requests":   "Too many failed attempts. Please try again later."
    };


    const friendlyMessage =
      authErrors[error.code] ??
      "Authentication failed. Please check your details and try again.";


    showToast(friendlyMessage, "error");


    adminLoginBtn.textContent = isSignUpMode
      ? "Create Account ✨"
      : "Secure Login 🛡️";

    adminLoginBtn.disabled = false;

  }

});


// ==========================================
// 🚪 ADMIN LOGOUT
// ==========================================

logoutBtn.addEventListener("click", async () => {

  try {

    await signOut(auth);


    // Reset form
    adminLoginForm.reset();


    // Reset button
    adminLoginBtn.textContent = "Secure Login 🛡️";

    adminLoginBtn.disabled = false;


    // Reset session states
    currentSessionId = "";

    currentLiveCode = "";

    currentSessionTitle = "";

    knownAttendees.clear();


    // Reset UI
    sessionInputGroup.style.display = "block";

    generateCodeBtn.style.display = "block";

    generateCodeBtn.disabled = false;

    generateCodeBtn.textContent = "Open Class & Generate Code 🚀";

    activeSessionDiv.style.display = "none";


    liveCount.textContent = "0";

    adminAttendeeList.innerHTML = `
      <p
        id="emptyState"
        style="text-align: center; color: var(--muted);"
      >
        Waiting for students to join...
      </p>
    `;


  } catch (error) {

    console.error("Logout error:", error);

    showToast("Something went wrong while signing out. Please try again.", "error");

  }

});


// ==========================================
// 🔐 GENERATE SECURE SESSION CODE
// ==========================================
//
// Format:
//
// AH-X7K92P
//
// Uses crypto.getRandomValues()
// instead of Math.random().
//

function generateSessionCode() {

  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const randomValues = new Uint32Array(6);

  crypto.getRandomValues(randomValues);

  let randomPart = "";

  for (let i = 0; i < 6; i++) {

    randomPart += characters[randomValues[i] % characters.length];

  }

  return `AH-${randomPart}`;

}


// ==========================================
// 🔍 GENERATE UNIQUE SESSION CODE
// ==========================================
//
// Checks Firestore to make sure another
// active session is not already using the
// generated code.
//

async function generateUniqueSessionCode() {

  const maxAttempts = 10;


  for (let attempt = 0; attempt < maxAttempts; attempt++) {

    const code = generateSessionCode();


    const codeQuery = query(

      collection(db, "sessions"),

      where("code", "==", code),

      where("isOpen", "==", true)

    );


    const snapshot = await getDocs(codeQuery);


    // Code is not currently being used
    if (snapshot.empty) {

      return code;

    }

  }


  // Extremely unlikely to happen
  throw new Error(
    "Could not generate a unique session code. Please try again."
  );

}


// ==========================================
// 🚀 OPEN CLASS
// ==========================================

generateCodeBtn.addEventListener("click", async () => {

  const title = sessionTitleInput.value.trim();


  // Validate title
  if (!title) {

    showToast(
      "Please enter a class or session title first.",
      "error"
    );

    sessionTitleInput.focus();

    return;

  }


  // Prevent overly long titles
  if (title.length > 100) {

    showToast(
      "Session title must be 100 characters or less.",
      "error"
    );

    sessionTitleInput.focus();

    return;

  }


  generateCodeBtn.textContent = "Opening Class... ⏳";

  generateCodeBtn.disabled = true;


  try {


    // ==========================================
    // GENERATE UNIQUE CODE
    // ==========================================

    currentLiveCode = await generateUniqueSessionCode();

    currentSessionTitle = title;


    // ==========================================
    // CREATE SESSION
    // ==========================================

    await setDoc(

      doc(db, "sessions", currentSessionId),

      {
        code:          currentLiveCode,
        sessionTitle:  currentSessionTitle,
        instructorId:  currentSessionId,
        isOpen:        true,
        createdAt:     new Date().toISOString()
      }

    );


    // ==========================================
    // UPDATE UI
    // ==========================================

    sessionInputGroup.style.display = "none";

    generateCodeBtn.style.display = "none";

    activeSessionDiv.style.display = "block";


    activeSessionTitleDisplay.textContent =
      `📚 ${currentSessionTitle}`;


    liveCodeDisplay.textContent = currentLiveCode;


    // Start realtime attendance listener
    startLiveListener();


  } catch (error) {

    console.error("Error creating session:", error);

    showToast(
      "Could not open class. Please check your connection and try again.",
      "error"
    );

    generateCodeBtn.textContent = "Open Class & Generate Code 🚀";

    generateCodeBtn.disabled = false;

  }

});


// ==========================================
// 👀 REAL-TIME ATTENDANCE LISTENER
// ==========================================

function startLiveListener() {

  const attendanceQuery = query(

    collection(db, "live_attendees"),

    where("instructorId", "==", currentSessionId),

    where("sessionCode", "==", currentLiveCode)

  );


  onSnapshot(

    attendanceQuery,

    (snapshot) => {

      // Update attendance count
      liveCount.textContent = snapshot.size;


      // Clear list
      adminAttendeeList.innerHTML = "";


      // Empty state
      if (snapshot.empty) {

        adminAttendeeList.innerHTML = `
          <p
            id="emptyState"
            style="text-align: center; color: var(--muted);"
          >
            Waiting for students to join...
          </p>
        `;

      }


      // Display attendees
      snapshot.forEach((docSnap) => {

        const student = docSnap.data();

        const li = document.createElement("li");


        // Avoid unsafe innerHTML with user input
        const nameSpan = document.createElement("span");

        nameSpan.textContent = student.name;


        const emailSpan = document.createElement("span");

        emailSpan.textContent = student.email;

        emailSpan.style.color = "var(--muted)";

        emailSpan.style.fontSize = "0.9em";

        emailSpan.style.fontWeight = "normal";

        emailSpan.style.marginLeft = "auto";


        li.appendChild(nameSpan);

        li.appendChild(emailSpan);

        adminAttendeeList.appendChild(li);


        // Show notification only for new attendees
        if (!knownAttendees.has(student.email)) {

          knownAttendees.add(student.email);

          triggerToast(student.name, student.email);

        }

      });

    },

    (error) => {

      console.error("Live attendance listener error:", error);

    }

  );

}


// ==========================================
// 🔔 NEW ATTENDEE TOAST
// ==========================================

function triggerToast(name, email) {

  const toast = document.createElement("div");

  toast.className = "toast toast--success";


  const icon = document.createElement("div");

  icon.style.fontSize = "2rem";

  icon.textContent = "👋";


  const content = document.createElement("div");


  const label = document.createElement("div");

  label.textContent = "New Check-In";

  label.style.color = "var(--teal)";

  label.style.fontSize = "0.8rem";

  label.style.textTransform = "uppercase";

  label.style.letterSpacing = "1px";


  const nameElement = document.createElement("strong");

  nameElement.textContent = name;

  nameElement.style.fontSize = "1.1rem";

  nameElement.style.color = "var(--navy)";


  const emailElement = document.createElement("small");

  emailElement.textContent = email;

  emailElement.style.color = "var(--muted)";


  content.appendChild(label);

  content.appendChild(nameElement);

  content.appendChild(document.createElement("br"));

  content.appendChild(emailElement);


  toast.appendChild(icon);

  toast.appendChild(content);

  toastContainer.appendChild(toast);


  setTimeout(() => {

    toast.style.animation =
      "slideOut 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards";

    setTimeout(() => toast.remove(), 400);

  }, 5000);

}


// ==========================================
// 📥 CLOSE CLASS & EXPORT CSV
// ==========================================

closeSessionBtn.addEventListener("click", async () => {

  // Replace native confirm() with custom modal
  const confirmed = await showConfirm({
    icon: "🔒",
    title: "Close this session?",
    message: "No more students will be able to check in. Your attendance CSV will be downloaded automatically.",
    confirmText: "Close & Export 📥",
    cancelText: "Not yet"
  });


  if (!confirmed) {

    return;

  }


  closeSessionBtn.textContent = "Closing & Exporting... ⏳";

  closeSessionBtn.disabled = true;


  try {


    // ==========================================
    // CLOSE SESSION
    // ==========================================

    await setDoc(

      doc(db, "sessions", currentSessionId),

      { isOpen: false },

      { merge: true }

    );


    // ==========================================
    // FETCH ATTENDANCE
    // ==========================================

    const attendanceQuery = query(

      collection(db, "live_attendees"),

      where("instructorId", "==", currentSessionId),

      where("sessionCode", "==", currentLiveCode)

    );


    const snapshot = await getDocs(attendanceQuery);


    // ==========================================
    // BUILD CSV
    // ==========================================

    let csvContent = "Status,Name,Email,Time\n";


    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      const timeStr = new Date(data.timestamp).toLocaleTimeString();


      // Escape double quotes for CSV safety
      const safeName  = String(data.name).replace(/"/g, '""');

      const safeEmail = String(data.email).replace(/"/g, '""');


      csvContent += `Present,"${safeName}","${safeEmail}","${timeStr}"\n`;

    });


    // ==========================================
    // DOWNLOAD CSV
    // ==========================================

    const blob = new Blob(
      [csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;


    const safeTitle = currentSessionTitle.replace(/[^a-z0-9]/gi, "_");

    link.download = `Attendance_${safeTitle}_${currentLiveCode}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);


    // ==========================================
    // UPDATE UI
    // ==========================================

    showToast("Session closed and attendance CSV exported!", "success");

    closeSessionBtn.textContent = "Session Closed 🔒";


  } catch (error) {

    console.error("Error closing/exporting session:", error);

    showToast(
      "Something went wrong while closing the session or exporting attendance.",
      "error"
    );

    closeSessionBtn.textContent = "Close Class & Export CSV 📥";

    closeSessionBtn.disabled = false;

  }

});


// ==========================================
// 📱 PWA SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {

  window.addEventListener("load", () => {

    navigator.serviceWorker
      .register("/sw.js")

      .then((registration) => {

        console.log(
          "Service Worker registered! Scope:",
          registration.scope
        );

      })

      .catch((error) => {

        console.log(
          "Service Worker registration failed:",
          error
        );

      });

  });

}
