// Migration script to update all partner_instructor users to mentor
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./lib/firebase";

const migrateRoles = async () => {
  try {
    // Get all users with partner_instructor role
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    
    const updates = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.role === 'partner_instructor') {
        console.log(`Updating user ${doc.id} from partner_instructor to mentor`);
        updates.push(
          updateDoc(doc.ref, {
            role: 'mentor',
            // Preserve existing permissions if any
            permissions: {
              view_assigned_courses: true,
              view_assigned_students: true,
              grade_assigned_assessments: true,
              provide_feedback: true,
              send_messages: true,
              create_announcements: true,
              view_course_content: true,
              ...userData.permissions // Keep any existing permissions
            }
          })
        );
      }
    });
    
    await Promise.all(updates);
    console.log(`Updated ${updates.length} users from partner_instructor to mentor`);
    
  } catch (error) {
    console.error("Migration error:", error);
  }
};

// Run the migration
migrateRoles();