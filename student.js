// ==========================================
// 🔥 FIREBASE IMPORTS
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc
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


// ==========================================
// 🎯 GRAB UI ELEMENTS
// ==========================================

const form = document.getElementById("studentCheckInForm");

const checkInBtn = document.getElementById("checkInBtn");

const studentLoginSection = document.getElementById(
  "studentLoginSection"
);

const heroText = document.querySelector(".hero p");

const nameInput = document.getElementById("studentName");

const emailInput = document.getElementById("studentEmail");

const codeInput = document.getElementById("liveAccessCode");


// ==========================================
// 📦 SESSION DATA
// ==========================================

let verifiedSessionData = null;


// ==========================================
// 🔤 NORMALIZE SESSION CODE
// ==========================================

function normalizeSessionCode(code) {

  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}


// ==========================================
// 🆔 CREATE SAFE ATTENDANCE DOCUMENT ID
// ==========================================
//
// Format:
//
// instructorId_sessionCode_email
//
// Example:
//
// abc123_AH-X7K92P_john@gmail.com
//
// Because this ID is predictable, the same
// email cannot create another attendance
// record for the same instructor/session.
//

function createAttendanceId(instructorId, sessionCode, email) {

  return `${instructorId}_${sessionCode}_${email}`;
}


// ==========================================
// 🔍 SESSION CODE LOOKUP
// ==========================================

let lookupTimeout;


codeInput.addEventListener("input", (e) => {

  clearTimeout(lookupTimeout);

  // Normalize input automatically
  const code = normalizeSessionCode(e.target.value);

  e.target.value = code;


  // New AccessHub code format:
  //
  // AH-XXXXX
  // AH-X7K92P
  //
  // Minimum 5 characters after AH-
  // Maximum 8 characters after AH-

  const codeRegex = /^AH-[A-Z0-9]{5,8}$/;


  if (codeRegex.test(code)) {

    lookupTimeout = setTimeout(() => {

      fetchClassPreview(code);

    }, 400);

  } else {

    verifiedSessionData = null;

    removePreviewBanner();
  }

});


// ==========================================
// 🔎 FETCH SESSION PREVIEW
// ==========================================

async function fetchClassPreview(code) {

  try {

    const sessionsQuery = query(

      collection(db, "sessions"),

      where("code", "==", code),

      where("isOpen", "==", true)

    );


    const sessionSnapshot = await getDocs(sessionsQuery);


    if (!sessionSnapshot.empty) {

      const sessionDoc = sessionSnapshot.docs[0];

      verifiedSessionData = {

        id: sessionDoc.id,

        ...sessionDoc.data()

      };


      showPreviewBanner(
        verifiedSessionData.sessionTitle
      );

    } else {

      verifiedSessionData = null;

      removePreviewBanner();
    }

  } catch (error) {

    console.error(
      "Session preview error:",
      error
    );

    verifiedSessionData = null;

    removePreviewBanner();
  }

}


// ==========================================
// 📚 SHOW CLASS PREVIEW
// ==========================================

function showPreviewBanner(title) {

  let banner = document.getElementById(
    "classPreviewBanner"
  );


  if (!banner) {

    banner = document.createElement("div");

    banner.id = "classPreviewBanner";


    banner.style.cssText = `
      background: var(--light);
      border: 2px solid var(--teal);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;


    codeInput.parentNode.parentNode.insertBefore(

      banner,

      codeInput.parentNode

    );

  }


  banner.innerHTML = `

    <span
      style="
        font-size: 0.85rem;
        color: var(--muted);
        text-transform: uppercase;
        display: block;
        font-weight: bold;
      "
    >
      Verified Live Session
    </span>

    <strong
      style="
        color: var(--navy);
        font-size: 1.1rem;
      "
    >
      📚 ${title}
    </strong>

  `;
}


// ==========================================
// 🗑️ REMOVE SESSION PREVIEW
// ==========================================

function removePreviewBanner() {

  const banner = document.getElementById(
    "classPreviewBanner"
  );


  if (banner) {

    banner.remove();

  }

}


// ==========================================
// 🔄 RESET BUTTON
// ==========================================

function resetButton() {

  checkInBtn.textContent = "Mark Me Present ✅";

  checkInBtn.disabled = false;
}


// ==========================================
// 📝 STUDENT CHECK-IN
// ==========================================

form.addEventListener(
  "submit",

  async (e) => {

    e.preventDefault();


    // ==========================================
    // ⏱️ RATE LIMITER
    // ==========================================

    const lastAttempt = localStorage.getItem(
      "last_checkin_attempt"
    );

    const now = Date.now();


    if (

      lastAttempt &&

      now - lastAttempt < 5000

    ) {

      alert(
        "⏳ Please wait a few seconds before trying again."
      );

      resetButton();

      return;
    }


    localStorage.setItem(

      "last_checkin_attempt",

      now

    );


    // ==========================================
    // 📥 GET FORM VALUES
    // ==========================================

    const name = nameInput.value.trim();

    const email = emailInput.value
      .trim()
      .toLowerCase();

    const code = normalizeSessionCode(
      codeInput.value
    );


    // ==========================================
    // 🔍 VALIDATE NAME
    // ==========================================

    const nameRegex =
      /^[a-zA-Z\s'-]{2,50}$/;


    if (!nameRegex.test(name)) {

      alert(
        "❌ Please enter a valid name using letters only."
      );

      nameInput.focus();

      resetButton();

      return;
    }


    // ==========================================
    // 📧 VALIDATE EMAIL
    // ==========================================

    // Slash is excluded because the email
    // becomes part of the Firestore document ID.

    const emailRegex =
      /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;


    if (!emailRegex.test(email)) {

      alert(
        "❌ Please enter a valid email address."
      );

      emailInput.focus();

      resetButton();

      return;
    }


    // ==========================================
    // 🔐 VALIDATE SESSION CODE
    // ==========================================

    const codeRegex =
      /^AH-[A-Z0-9]{5,8}$/;


    if (!codeRegex.test(code)) {

      alert(
        "❌ Invalid AccessHub session code."
      );

      codeInput.focus();

      resetButton();

      return;
    }


    // ==========================================
    // ⏳ LOADING STATE
    // ==========================================

    checkInBtn.textContent =
      "Verifying & Checking In... ⏳";

    checkInBtn.disabled = true;


    try {


      // ==========================================
      // 🔍 RE-VERIFY SESSION
      // ==========================================

      const sessionsQuery = query(

        collection(db, "sessions"),

        where("code", "==", code),

        where("isOpen", "==", true)

      );


      const sessionSnapshot =
        await getDocs(sessionsQuery);


      // No active session found

      if (sessionSnapshot.empty) {

        alert(
          "❌ Invalid session code or this session is currently closed."
        );

        resetButton();

        return;
      }


      const sessionDoc =
        sessionSnapshot.docs[0];


      const sessionData =
        sessionDoc.data();


      const instructorId =
        sessionData.instructorId;


      const sessionTitle =
        sessionData.sessionTitle ||
        "Live Session";


      // ==========================================
      // ⏰ SESSION EXPIRY CHECK
      // ==========================================

      const threeHoursAgo =

        new Date(
          Date.now() -
          3 * 60 * 60 * 1000
        ).toISOString();


      if (

        sessionData.createdAt &&

        sessionData.createdAt < threeHoursAgo

      ) {

        alert(
          "❌ This session has expired. Please ask your instructor for a new session code."
        );

        resetButton();

        return;
      }


      // ==========================================
      // 🆔 CREATE DETERMINISTIC ATTENDANCE ID
      // ==========================================

      const attendanceId =
        createAttendanceId(

          instructorId,

          code,

          email

        );


      // ==========================================
      // 🛡️ CREATE ATTENDANCE RECORD
      // ==========================================
      //
      // We use setDoc with a deterministic ID.
      //
      // The Firestore Rules only allow CREATE.
      //
      // If this document already exists,
      // Firestore rejects the request.
      //
      // This gives us database-level duplicate
      // prevention.
      //

      const attendanceRef = doc(

        db,

        "live_attendees",

        attendanceId

      );


      await setDoc(

        attendanceRef,

        {

          instructorId: instructorId,

          name: name,

          email: email,

          sessionCode: code,

          sessionTitle: sessionTitle,

          timestamp: new Date().toISOString()

        }

      );


      // ==========================================
      // 🎉 SUCCESS UI
      // ==========================================

      studentLoginSection.innerHTML = `

        <div
          style="
            padding: 40px;
            text-align: center;
          "
        >

          <h2
            style="
              font-size: 5rem;
              margin-bottom: 20px;
              animation: fadeIn 0.5s ease;
            "
          >
            ✅
          </h2>


          <h3
            style="
              color: var(--teal);
              margin-bottom: 10px;
              font-size: 1.5rem;
            "
          >
            You're checked in, ${name}!
          </h3>


          <p
            style="
              color: var(--navy);
              font-weight: bold;
              margin-bottom: 10px;
            "
          >
            📚 ${sessionTitle}
          </p>


          <p
            style="
              color: var(--muted);
              margin-bottom: 25px;
            "
          >
            Your attendance has been successfully recorded.
            You can now close this page.
          </p>


          <button

            onclick="location.reload();"

            style="
              max-width: 250px;
              margin: 0 auto;
              background: var(--navy);
            "

          >

            Back to Check-In 🔄

          </button>

        </div>

      `;


      heroText.textContent =
        "Attendance successfully verified. Enjoy the session!";


    } catch (error) {


      console.error(
        "Check-in error:",
        error
      );


      // ==========================================
      // 🚫 HANDLE DUPLICATE / SECURITY ERRORS
      // ==========================================

      if (

        error.code === "permission-denied"

      ) {

        alert(
          "⚠️ Check-in could not be completed. You may have already checked in for this session, or the session is no longer active."
        );

      } else {

        alert(
          "⚠️ Connection error. Please check your internet and try again."
        );

      }


      resetButton();

    }

  }

);


// ==========================================
// 📱 PWA SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {

  window.addEventListener(

    "load",

    () => {

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

    }

  );

}