# Dukan Scan

Apni dukan ke products add karo, dukan price aur MRP alag rakho, sale record karo, customer ko label print karo, aur roz ka profit dekho.

## Features
- Login / Signup (naam + dukan ka naam)
- Product add: naam, dukan price, MRP, barcode (camera scan ya manual)
- Sell screen: product select karo, customer se liya gaya price daalo, profit auto calculate hota hai
- Label print: product naam + MRP print (58mm thermal printer size ke liye style kiya hai, normal printer pe bhi chalega)
- Dashboard: aaj ki total bikri, aaj ka profit, aaj kitne items beche

## Setup (step-by-step)

### 1. Firebase project banao
1. https://console.firebase.google.com par jao, **Add project** dabao
2. Project ka naam do (e.g. "dukan-scan"), continue karte jao, project bana lo
3. Left menu mein **Build > Authentication** > **Get started** > **Email/Password** ko enable karo
4. Left menu mein **Build > Firestore Database** > **Create database** > production mode mein start karo (koi bhi region choose kar lo)
5. Firestore ke **Rules** tab mein jaake is repo ki `firestore.rules` file ka content paste karke **Publish** karo
6. Gear icon (⚙️) > **Project settings** > neeche scroll karke **Your apps** > web icon (`</>`) pe click karo > app register karo
7. Jo `firebaseConfig` object milega, use copy kar lo

### 2. Config paste karo
`src/firebase.js` file kholo aur `firebaseConfig` ki saari values apne Firebase project ki values se replace karo.

### 2.5 Apna secret Setup Code banao
`src/setupCode.js` file kholo, `apna-secret-code-yaha-likho` ki jagah apna khud ka koi secret word/number likh do. Ye code sirf tumhe pata hoga — koi bhi random insaan is link par aakar signup nahi kar payega, sirf wahi jisko ye code pata hai (yaani tum).

### 3. GitHub par upload
1. GitHub par naya repository banao (e.g. `dukan-scan`)
2. Repo ke web editor (`.` dabakar github.dev khol sakte ho) mein saari files is structure ke hisaab se add karo
3. Commit karo

### 4. Vercel par deploy
1. https://vercel.com par GitHub se login karo
2. **Add New > Project** > apni `dukan-scan` repo select karo
3. Framework "Vite" apne aap detect ho jayega — **Deploy** dabao
4. 1-2 minute mein live link mil jayega

### 5. Test karo
1. Deployed link kholo, **Naya Account** se signup karo
2. Products tab mein 2-3 product add karo
3. Sell tab se ek sale karo, label print karke dekho
4. Home tab par aaj ka profit dikhega

## Barcode scanning note
Camera se barcode scan sirf un phones/browsers mein chalega jo `BarcodeDetector` API support karte hain (zyada tar Android Chrome). Agar support nahi hai to barcode field manually type kar sakte ho — koi feature miss nahi hoga.

## Phone par app jaisa install karna (PWA)
Deploy hone ke baad ye ek installable app ban jata hai — Play Store ki zaroorat nahi:

**Android (Chrome):**
1. Deployed link kholo
2. Top-right 3-dot menu → "Add to Home screen" / "Install app" dabao
3. Icon home screen par aa jayega, app jaisa fullscreen khulega

**iPhone (Safari):**
1. Deployed link kholo
2. Share button (⬆️) dabao → "Add to Home Screen"
3. Icon home screen par aa jayega

Isse app offline bhi thoda kaam karega (pehle se khule pages cache ho jate hain), aur browser address bar bhi nahi dikhega.
