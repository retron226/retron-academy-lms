import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { isFirebaseInitialized } from "../lib/firebase";
import { hasPermission as checkPermission, canAccessRoute, isGuestAccessExpired } from "../lib/rbac";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guestExpired, setGuestExpired] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setUser(user);
            if (user) {
                // REAL-TIME: Listen to changes in the user document
                const unsubscribeSnapshot = onSnapshot(
                    doc(db, "users", user.uid),
                    async (snapshot) => {
                        if (snapshot.exists()) {
                            const data = snapshot.data();
                            let enhancedData = { ...data, uid: user.uid };

                            // MENTOR LOOKUP: Query mentorAssignments collection using studentId
                            if (data.role === 'student') {
                                try {
                                    // Based on your schema: studentId is the field name
                                    const mentorMappingQuery = query(
                                        collection(db, "mentorAssignments"),
                                        where("studentId", "==", user.uid),
                                        where("status", "==", "active"),
                                        limit(1)
                                    );

                                    const mappingSnap = await getDocs(mentorMappingQuery);

                                    if (!mappingSnap.empty) {
                                        // Fetch the mentorId from the mapping document
                                        enhancedData.mentorId = mappingSnap.docs[0].data().mentorId;
                                        console.log("Assigned Mentor ID found:", enhancedData.mentorId);
                                    }
                                } catch (error) {
                                    console.error("Error fetching mentor mapping:", error);
                                }
                            }

                            setUserData(enhancedData);
                            setGuestExpired(data.role === 'guest' && isGuestAccessExpired(data));
                        } else {
                            setUserData(null);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Firestore Snapshot error:", error);
                        setLoading(false);
                    }
                );
                return () => unsubscribeSnapshot();
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const signOut = () => {
        setGuestExpired(false);
        return firebaseSignOut(auth);
    };

    // Permission helpers (Blocks access if user is suspended in Firestore)
    const hasPermission = (permission) => {
        if (!userData || userData.suspended) return false;
        if (userData.role === 'guest' && guestExpired) return false;
        return checkPermission(userData, permission);
    };

    const canAccess = (route) => {
        if (!userData || userData.suspended) return false;
        if (userData.role === 'guest' && guestExpired) return false;
        return canAccessRoute(userData, route);
    };

    const value = {
        user,
        userData,
        loading,
        guestExpired,
        signOut,
        hasRole: (role) => userData?.role === role,
        hasPermission,
        canAccess,
    };

    if (!isFirebaseInitialized) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-2">
                <h1 className="text-xl font-bold text-red-600">Config Error</h1>
                <p>Firebase variables not found.</p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex h-screen w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};