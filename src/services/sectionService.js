import { db } from "../lib/firebase";
import { addDoc, updateDoc, deleteDoc, doc, collection, getDoc, writeBatch, getDocs, orderBy, query, where } from "firebase/firestore";

// Modal utility functions (you'll need to implement or import these)
// These are placeholder functions - implement them according to your UI framework
const showModal = async (modalConfig) => {
  // Implementation depends on your UI framework (React, Vue, etc.)
  // Return a promise that resolves with user input
  // Example: return { title: "User Input", duration: "60 min" }
  throw new Error("showModal function not implemented");
};

const showConfirmModal = async (message, title = "Confirm") => {
  // Implementation depends on your UI framework
  // Return a promise that resolves with true/false
  throw new Error("showConfirmModal function not implemented");
};

// ADD THIS getSection FUNCTION
export const getSection = async (courseId, sectionId) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const section = await getDoc(sectionRef);
        
        if (!section.exists()) {
            throw new Error("Section not found");
        }

        return {
            id: section.id,
            ...section.data()
        };
    } catch (error) {
        console.error("Error fetching section:", error);
        throw new Error(`Failed to fetch section: ${error.message}`);
    }
};

// Helper function to parse duration string to minutes
const parseDuration = (durationString) => {
    if (!durationString) return 60;
    
    const match = durationString.match(/(\d+)\s*(min|minutes|hour|hours|h|m)/i);
    if (!match) return 60;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.includes('hour') || unit === 'h') {
        return value * 60;
    }
    return value; // minutes
};

export const addSection = async (courseId, title, order = null) => {
    if (!courseId || !title?.trim()) {
        throw new Error("Course ID and title are required");
    }

    try {
        // Get the next order if not provided
        let sectionOrder = order;
        if (sectionOrder === null || sectionOrder === undefined) {
            sectionOrder = await getNextSectionOrder(courseId);
        }

        const sectionData = {
            title: title.trim(),
            order: sectionOrder,
            modules: [],
            subSections: [],
            description: "",
            objectives: [],
            prerequisites: [],
            resources: [],
            isActive: true,
            isPublished: false,
            estimatedTime: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const sectionRef = await addDoc(
            collection(db, "courses", courseId, "sections"),
            sectionData
        );

        return {
            id: sectionRef.id,
            ...sectionData
        };
    } catch (error) {
        console.error("Error adding section:", error);
        throw new Error(`Failed to add section: ${error.message}`);
    }
};

export const deleteSection = async (courseId, sectionId, options = {}) => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    const {
        confirm = true,
        force = false,
        deleteModules = true,
        deleteSubSections = true,
        backup = false
    } = options;

    // Ask for confirmation if enabled
    if (confirm && !force) {
        const confirmed = await showConfirmModal(
            "Are you sure you want to delete this section and all its content?\n\n" +
            "This action cannot be undone.",
            "Delete Section"
        );
        if (!confirmed) {
            return {
                success: false,
                message: "Deletion cancelled by user",
                cancelled: true
            };
        }
    }

    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        
        // Get section data for backup if requested
        let sectionData = null;
        if (backup) {
            const sectionDoc = await getDoc(sectionRef);
            if (sectionDoc.exists()) {
                sectionData = {
                    id: sectionDoc.id,
                    ...sectionDoc.data(),
                    deletedAt: new Date().toISOString(),
                    deletedBy: options.deletedBy || "system"
                };
            }
        }

        // Create a backup if requested
        if (backup && sectionData) {
            try {
                await addDoc(collection(db, "deleted_sections"), {
                    ...sectionData,
                    originalCourseId: courseId,
                    backupCreatedAt: new Date().toISOString(),
                    canBeRestored: true
                });
            } catch (backupError) {
                console.warn("Failed to create backup:", backupError);
                // Continue with deletion even if backup fails
            }
        }

        // Delete the section
        await deleteDoc(sectionRef);

        // Update other sections' order
        await reorderSectionsAfterDeletion(courseId);

        return {
            success: true,
            message: "Section deleted successfully",
            sectionId,
            courseId,
            backupCreated: backup && sectionData,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error deleting section:", error);
        throw new Error(`Failed to delete section: ${error.message}`);
    }
};

// Force delete without confirmation
export const forceDeleteSection = async (courseId, sectionId, backup = false) => {
    return deleteSection(courseId, sectionId, {
        confirm: false,
        force: true,
        backup
    });
};

// Soft delete (mark as deleted but keep data)
export const softDeleteSection = async (courseId, sectionId, reason = "") => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const currentData = sectionDoc.data();
        
        await updateDoc(sectionRef, {
            deleted: true,
            deletedAt: new Date().toISOString(),
            deletedReason: reason,
            isActive: false,
            updatedAt: new Date().toISOString(),
            // Keep original data but mark as deleted
            ...currentData
        });

        return {
            success: true,
            message: "Section soft deleted successfully",
            sectionId,
            canBeRestored: true,
            deletedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error soft deleting section:", error);
        throw new Error(`Failed to soft delete section: ${error.message}`);
    }
};

// Restore soft-deleted section
export const restoreSection = async (courseId, sectionId) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const sectionDoc = await getDoc(sectionRef);
        
        if (!sectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const currentData = sectionDoc.data();
        
        await updateDoc(sectionRef, {
            deleted: false,
            deletedAt: null,
            deletedReason: "",
            isActive: true,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            message: "Section restored successfully",
            sectionId
        };
    } catch (error) {
        console.error("Error restoring section:", error);
        throw new Error(`Failed to restore section: ${error.message}`);
    }
};

// Delete multiple sections
export const deleteMultipleSections = async (courseId, sectionIds, options = {}) => {
    if (!courseId || !Array.isArray(sectionIds) || sectionIds.length === 0) {
        throw new Error("Course ID and section IDs array are required");
    }

    const {
        confirm = true,
        backup = false,
        batchSize = 10
    } = options;

    // Ask for confirmation
    if (confirm) {
        const confirmed = await showConfirmModal(
            `Are you sure you want to delete ${sectionIds.length} section(s)?\n\n` +
            "This action cannot be undone.",
            "Delete Multiple Sections"
        );
        if (!confirmed) {
            return {
                success: false,
                message: "Deletion cancelled by user",
                cancelled: true
            };
        }
    }

    try {
        const batch = writeBatch(db);
        const results = [];
        const deletedSections = [];

        // Process in batches to avoid Firestore limits
        for (let i = 0; i < sectionIds.length; i += batchSize) {
            const batchSectionIds = sectionIds.slice(i, i + batchSize);
            
            for (const sectionId of batchSectionIds) {
                const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
                
                // Get data for backup
                if (backup) {
                    const sectionDoc = await getDoc(sectionRef);
                    if (sectionDoc.exists()) {
                        const sectionData = {
                            id: sectionDoc.id,
                            ...sectionDoc.data(),
                            deletedAt: new Date().toISOString()
                        };
                        deletedSections.push(sectionData);
                    }
                }
                
                batch.delete(sectionRef);
                results.push({ sectionId, success: true });
            }
            
            await batch.commit();
        }

        // Create backups if requested
        if (backup && deletedSections.length > 0) {
            try {
                const backupBatch = writeBatch(db);
                for (const sectionData of deletedSections) {
                    const backupRef = doc(collection(db, "deleted_sections"));
                    backupBatch.set(backupRef, {
                        ...sectionData,
                        originalCourseId: courseId,
                        backupCreatedAt: new Date().toISOString(),
                        canBeRestored: true
                    });
                }
                await backupBatch.commit();
            } catch (backupError) {
                console.warn("Failed to create backups:", backupError);
            }
        }

        // Reorder remaining sections
        await reorderSectionsAfterDeletion(courseId);

        return {
            success: true,
            message: `Successfully deleted ${results.length} section(s)`,
            deletedCount: results.length,
            results,
            backupCreated: backup && deletedSections.length > 0,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error deleting multiple sections:", error);
        throw new Error(`Failed to delete sections: ${error.message}`);
    }
};

// Delete sections by condition (e.g., empty sections, old sections)
export const deleteSectionsByCondition = async (courseId, condition, options = {}) => {
    if (!courseId || typeof condition !== 'function') {
        throw new Error("Course ID and condition function are required");
    }

    try {
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(sectionsRef);
        
        const sectionsToDelete = [];
        
        sectionsSnapshot.forEach(docSnap => {
            const sectionData = {
                id: docSnap.id,
                ...docSnap.data()
            };
            
            if (condition(sectionData)) {
                sectionsToDelete.push(sectionData.id);
            }
        });

        if (sectionsToDelete.length === 0) {
            return {
                success: true,
                message: "No sections match the condition",
                deletedCount: 0
            };
        }

        return deleteMultipleSections(courseId, sectionsToDelete, options);
    } catch (error) {
        console.error("Error deleting sections by condition:", error);
        throw new Error(`Failed to delete sections by condition: ${error.message}`);
    }
};

// Helper function to reorder sections after deletion
const reorderSectionsAfterDeletion = async (courseId) => {
    try {
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "asc")));
        
        const batch = writeBatch(db);
        let order = 0;
        
        sectionsSnapshot.forEach((docSnap, index) => {
            const sectionRef = doc(db, "courses", courseId, "sections", docSnap.id);
            batch.update(sectionRef, {
                order: index,
                updatedAt: new Date().toISOString()
            });
            order++;
        });
        
        await batch.commit();
    } catch (error) {
        console.error("Error reordering sections:", error);
        // Don't throw error here - deletion succeeded even if reordering fails
    }
};

// Permanent delete from backup (cannot be restored)
export const permanentDeleteSection = async (backupSectionId) => {
    if (!backupSectionId) {
        throw new Error("Backup section ID is required");
    }

    try {
        const backupRef = doc(db, "deleted_sections", backupSectionId);
        await deleteDoc(backupRef);

        return {
            success: true,
            message: "Section permanently deleted from backups",
            backupSectionId,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error permanently deleting section:", error);
        throw new Error(`Failed to permanently delete section: ${error.message}`);
    }
};

// Get deleted sections (from backup)
export const getDeletedSections = async (courseId = null) => {
    try {
        let queryRef = collection(db, "deleted_sections");
        
        if (courseId) {
            queryRef = query(
                queryRef,
                where("originalCourseId", "==", courseId),
                orderBy("deletedAt", "desc")
            );
        } else {
            queryRef = query(queryRef, orderBy("deletedAt", "desc"));
        }

        const snapshot = await getDocs(queryRef);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching deleted sections:", error);
        throw new Error(`Failed to fetch deleted sections: ${error.message}`);
    }
};

// Restore section from backup
export const restoreFromBackup = async (backupSectionId, targetCourseId = null) => {
    try {
        const backupRef = doc(db, "deleted_sections", backupSectionId);
        const backupDoc = await getDoc(backupRef);
        
        if (!backupDoc.exists()) {
            throw new Error("Backup not found");
        }

        const backupData = backupDoc.data();
        const courseId = targetCourseId || backupData.originalCourseId;
        
        // Create new section from backup
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "desc")));
        const nextOrder = sectionsSnapshot.empty ? 0 : sectionsSnapshot.docs[0].data().order + 1;

        const newSectionData = {
            ...backupData,
            id: undefined, // Let Firestore generate new ID
            order: nextOrder,
            deleted: false,
            deletedAt: null,
            deletedReason: "",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            restoredFromBackup: backupSectionId,
            restorationDate: new Date().toISOString()
        };

        // Remove backup-specific fields
        delete newSectionData.backupCreatedAt;
        delete newSectionData.canBeRestored;
        delete newSectionData.originalCourseId;

        const newSectionRef = await addDoc(sectionsRef, newSectionData);

        // Delete from backups
        await deleteDoc(backupRef);

        return {
            success: true,
            message: "Section restored from backup successfully",
            newSectionId: newSectionRef.id,
            courseId,
            originalBackupId: backupSectionId
        };
    } catch (error) {
        console.error("Error restoring from backup:", error);
        throw new Error(`Failed to restore from backup: ${error.message}`);
    }
};

export const addSubSection = async (courseId, sectionId, subSectionData = null) => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    // If subSectionData is provided, use it. Otherwise, show modal for user input.
    let title, duration, description, objectives;
    
    if (subSectionData) {
        title = subSectionData.title;
        duration = subSectionData.duration || "60 min";
        description = subSectionData.description || "";
        objectives = subSectionData.objectives || [];
    } else {
        try {
            // Show modal for user input
            const modalResult = await showModal({
                title: "Add New Sub-Section",
                fields: [
                    {
                        name: "title",
                        label: "Sub-Section Title",
                        type: "text",
                        required: true,
                        placeholder: "Enter sub-section title"
                    },
                    {
                        name: "duration",
                        label: "Duration",
                        type: "text",
                        required: false,
                        placeholder: "e.g., 45 min",
                        defaultValue: "60 min"
                    },
                    {
                        name: "description",
                        label: "Description (Optional)",
                        type: "textarea",
                        required: false,
                        placeholder: "Enter description"
                    },
                    {
                        name: "objectives",
                        label: "Learning Objectives (Optional)",
                        type: "textarea",
                        required: false,
                        placeholder: "Enter comma-separated objectives"
                    }
                ],
                submitText: "Add Sub-Section",
                cancelText: "Cancel"
            });

            if (!modalResult) {
                return { cancelled: true }; // User cancelled the modal
            }

            title = modalResult.title;
            duration = modalResult.duration || "60 min";
            description = modalResult.description || "";
            
            const objectivesInput = modalResult.objectives || "";
            objectives = objectivesInput ? 
                objectivesInput.split(',').map(obj => obj.trim()).filter(obj => obj) : [];

        } catch (error) {
            console.error("Modal error:", error);
            throw new Error("Failed to get user input from modal");
        }
    }

    if (!title?.trim()) {
        throw new Error("Sub-section title is required");
    }

    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const section = await getDoc(sectionRef);
        
        if (!section.exists()) {
            throw new Error("Section not found");
        }

        const currentData = section.data();
        const currentSubSections = currentData.subSections || [];
        
        // Generate a unique ID for the new sub-section
        const subSectionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newSubSection = {
            id: subSectionId,
            title: title.trim(),
            duration: duration?.trim() || "60 min",
            description: description.trim(),
            objectives: objectives,
            modules: [],
            order: currentSubSections.length, // Add at the end
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Additional metadata
            estimatedTime: parseDuration(duration?.trim() || "60 min"),
            isActive: true,
            completionCriteria: "",
            prerequisites: []
        };

        const updatedSubSections = [...currentSubSections, newSubSection];
        
        await updateDoc(sectionRef, { 
            subSections: updatedSubSections,
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            subSection: newSubSection,
            message: "Sub-section added successfully"
        };
    } catch (error) {
        console.error("Error adding sub-section:", error);
        throw new Error(`Failed to add sub-section: ${error.message}`);
    }
};

// Also add getSubSection function if needed
export const getSubSection = async (courseId, sectionId, subSectionId) => {
    try {
        const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const section = await getDoc(sectionRef);
        
        if (!section.exists()) {
            throw new Error("Section not found");
        }

        const subSections = section.data().subSections || [];
        const subSection = subSections.find(sub => sub.id === subSectionId);
        
        if (!subSection) {
            throw new Error("Sub-section not found");
        }

        return subSection;
    } catch (error) {
        console.error("Error fetching sub-section:", error);
        throw new Error(`Failed to fetch sub-section: ${error.message}`);
    }
};

// Now the duplicateSection functions can use getSection
export const duplicateSection = async (courseId, sectionId) => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    try {
        // Get the original section
        const originalSectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const originalSectionDoc = await getDoc(originalSectionRef);
        
        if (!originalSectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const originalSection = originalSectionDoc.data();
        
        // Show modal for new title
        const modalResult = await showModal({
            title: "Duplicate Section",
            fields: [
                {
                    name: "title",
                    label: "New Section Title",
                    type: "text",
                    required: true,
                    defaultValue: `${originalSection.title} (Copy)`,
                    placeholder: "Enter new section title"
                }
            ],
            submitText: "Duplicate",
            cancelText: "Cancel"
        });

        if (!modalResult) {
            return { cancelled: true }; // User cancelled
        }

        // Create new section data
        const newSectionData = {
            title: modalResult.title,
            order: await getNextSectionOrder(courseId),
            modules: originalSection.modules ? 
                originalSection.modules.map(module => ({
                    ...module,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })) : [],
            subSections: originalSection.subSections ? 
                originalSection.subSections.map(subSection => ({
                    ...subSection,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    modules: subSection.modules ? 
                        subSection.modules.map(module => ({
                            ...module,
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        })) : [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })) : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add the duplicated section
        const newSectionRef = await addDoc(
            collection(db, "courses", courseId, "sections"),
            newSectionData
        );

        return {
            id: newSectionRef.id,
            ...newSectionData
        };
    } catch (error) {
        console.error("Error duplicating section:", error);
        throw new Error(`Failed to duplicate section: ${error.message}`);
    }
};

export const duplicateSectionWithReferences = async (courseId, sectionId, newTitle = null) => {
    if (!courseId || !sectionId) {
        throw new Error("Course ID and section ID are required");
    }

    try {
        // Get the original section
        const originalSectionRef = doc(db, "courses", courseId, "sections", sectionId);
        const originalSectionDoc = await getDoc(originalSectionRef);
        
        if (!originalSectionDoc.exists()) {
            throw new Error("Section not found");
        }

        const originalSection = originalSectionDoc.data();
        
        // Show modal for new title if not provided
        let finalTitle = newTitle;
        if (!finalTitle) {
            const modalResult = await showModal({
                title: "Duplicate Section",
                fields: [
                    {
                        name: "title",
                        label: "New Section Title",
                        type: "text",
                        required: true,
                        defaultValue: `${originalSection.title} (Copy)`,
                        placeholder: "Enter new section title"
                    }
                ],
                submitText: "Duplicate",
                cancelText: "Cancel"
            });

            if (!modalResult) {
                return { cancelled: true };
            }
            finalTitle = modalResult.title;
        }
        
        // Get next available order
        const nextOrder = await getNextSectionOrder(courseId);
        
        // Create new section data with deep copy
        const newSectionData = {
            title: finalTitle,
            order: nextOrder,
            modules: deepCopyModules(originalSection.modules || []),
            subSections: deepCopySubSections(originalSection.subSections || []),
            description: originalSection.description || "",
            objectives: originalSection.objectives ? [...originalSection.objectives] : [],
            prerequisites: originalSection.prerequisites ? [...originalSection.prerequisites] : [],
            resources: originalSection.resources ? [...originalSection.resources] : [],
            metadata: originalSection.metadata ? { ...originalSection.metadata } : {},
            settings: originalSection.settings ? { ...originalSection.settings } : {},
            tags: originalSection.tags ? [...originalSection.tags] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Use batch write for atomic operation
        const batch = writeBatch(db);
        const newSectionRef = doc(collection(db, "courses", courseId, "sections"));
        
        batch.set(newSectionRef, newSectionData);
        await batch.commit();

        return {
            id: newSectionRef.id,
            ...newSectionData
        };
    } catch (error) {
        console.error("Error duplicating section with references:", error);
        throw new Error(`Failed to duplicate section: ${error.message}`);
    }
};

export const duplicateSectionAsTemplate = async (courseId, sectionId, templateName = null) => {
    try {
        const originalSection = await getSection(courseId, sectionId);
        
        // Show modal for template name if not provided
        let finalTemplateName = templateName;
        if (!finalTemplateName) {
            const modalResult = await showModal({
                title: "Create Template from Section",
                fields: [
                    {
                        name: "name",
                        label: "Template Name",
                        type: "text",
                        required: true,
                        defaultValue: `${originalSection.title} - Template`,
                        placeholder: "Enter template name"
                    }
                ],
                submitText: "Create Template",
                cancelText: "Cancel"
            });

            if (!modalResult) {
                return { cancelled: true };
            }
            finalTemplateName = modalResult.name;
        }
        
        // Create template section data
        const templateData = {
            title: finalTemplateName,
            order: 0, // Templates typically go first
            modules: originalSection.modules || [],
            subSections: originalSection.subSections || [],
            isTemplate: true,
            templateDescription: `Template based on: ${originalSection.title}`,
            originalSectionId: sectionId,
            usageCount: 0,
            tags: ['template', ...(originalSection.tags || [])],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const templateRef = await addDoc(
            collection(db, "templates"),
            templateData
        );

        return {
            id: templateRef.id,
            ...templateData
        };
    } catch (error) {
        console.error("Error creating section template:", error);
        throw new Error(`Failed to create template: ${error.message}`);
    }
};

export const duplicateSectionToCourse = async (sourceCourseId, sectionId, targetCourseId) => {
    if (!sourceCourseId || !sectionId || !targetCourseId) {
        throw new Error("Source course, section, and target course IDs are required");
    }

    try {
        const originalSection = await getSection(sourceCourseId, sectionId);
        
        // Show modal for new title
        const modalResult = await showModal({
            title: "Duplicate Section to Another Course",
            fields: [
                {
                    name: "title",
                    label: "New Section Title",
                    type: "text",
                    required: true,
                    defaultValue: `${originalSection.title} (Copied)`,
                    placeholder: "Enter new section title"
                }
            ],
            submitText: "Duplicate",
            cancelText: "Cancel"
        });

        if (!modalResult) {
            return { cancelled: true };
        }
        
        // Get next order in target course
        const targetSectionsRef = collection(db, "courses", targetCourseId, "sections");
        const targetSectionsSnapshot = await getDocs(query(targetSectionsRef, orderBy("order", "desc")));
        const nextOrder = targetSectionsSnapshot.empty ? 0 : targetSectionsSnapshot.docs[0].data().order + 1;
        
        const duplicatedSectionData = {
            ...originalSection,
            id: undefined, // Let Firestore generate new ID
            title: modalResult.title,
            order: nextOrder,
            modules: deepCopyModules(originalSection.modules || []),
            subSections: deepCopySubSections(originalSection.subSections || []),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceCourseId,
            originalSectionId: sectionId
        };

        const newSectionRef = await addDoc(
            collection(db, "courses", targetCourseId, "sections"),
            duplicatedSectionData
        );

        return {
            id: newSectionRef.id,
            ...duplicatedSectionData
        };
    } catch (error) {
        console.error("Error duplicating section to another course:", error);
        throw new Error(`Failed to duplicate section to target course: ${error.message}`);
    }
};

// Helper functions
const getNextSectionOrder = async (courseId) => {
    try {
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "desc")));
        
        if (sectionsSnapshot.empty) {
            return 0;
        }
        
        const lastSection = sectionsSnapshot.docs[0].data();
        return lastSection.order + 1;
    } catch (error) {
        console.error("Error getting next section order:", error);
        return 0; // Fallback to 0
    }
};

const deepCopyModules = (modules) => {
    return modules.map(module => ({
        ...module,
        id: generateUniqueId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Reset completion status if it exists
        completedBy: [],
        progress: 0,
        // Copy quiz data if exists
        quizData: module.quizData ? module.quizData.map(question => ({ ...question })) : null,
        // Copy attachments if they exist
        attachments: module.attachments ? [...module.attachments] : []
    }));
};

const deepCopySubSections = (subSections) => {
    return subSections.map(subSection => ({
        ...subSection,
        id: generateUniqueId(),
        modules: deepCopyModules(subSection.modules || []),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Reset completion tracking
        completedBy: [],
        progress: 0
    }));
};

const generateUniqueId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Bulk duplication
export const duplicateMultipleSections = async (courseId, sectionIds) => {
    if (!courseId || !sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0) {
        throw new Error("Course ID and section IDs array are required");
    }

    try {
        // Show confirmation modal
        const confirmed = await showConfirmModal(
            `Are you sure you want to duplicate ${sectionIds.length} section(s)?`,
            "Duplicate Multiple Sections"
        );
        
        if (!confirmed) {
            return { cancelled: true };
        }

        const batch = writeBatch(db);
        const results = [];
        
        // Get current max order
        const sectionsRef = collection(db, "courses", courseId, "sections");
        const sectionsSnapshot = await getDocs(query(sectionsRef, orderBy("order", "desc")));
        let nextOrder = sectionsSnapshot.empty ? 0 : sectionsSnapshot.docs[0].data().order + 1;

        // Get all original sections
        for (const sectionId of sectionIds) {
            const originalSectionRef = doc(db, "courses", courseId, "sections", sectionId);
            const originalSectionDoc = await getDoc(originalSectionRef);
            
            if (originalSectionDoc.exists()) {
                const originalSection = originalSectionDoc.data();
                
                const newSectionData = {
                    title: `${originalSection.title} (Copy)`,
                    order: nextOrder++,
                    modules: deepCopyModules(originalSection.modules || []),
                    subSections: deepCopySubSections(originalSection.subSections || []),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const newSectionRef = doc(collection(db, "courses", courseId, "sections"));
                batch.set(newSectionRef, newSectionData);
                
                results.push({
                    originalId: sectionId,
                    newId: newSectionRef.id,
                    title: newSectionData.title
                });
            }
        }

        await batch.commit();
        return results;
    } catch (error) {
        console.error("Error duplicating multiple sections:", error);
        throw new Error(`Failed to duplicate sections: ${error.message}`);
    }
};

// Template-based section creation
export const createSectionFromTemplate = async (courseId, templateId, sectionData = {}) => {
    try {
        // Get template
        const templateRef = doc(db, "templates", templateId);
        const templateDoc = await getDoc(templateRef);
        
        if (!templateDoc.exists()) {
            throw new Error("Template not found");
        }

        const template = templateDoc.data();
        
        // Show modal for section details if not provided
        let finalSectionData = { ...sectionData };
        if (!finalSectionData.title) {
            const modalResult = await showModal({
                title: "Create Section from Template",
                fields: [
                    {
                        name: "title",
                        label: "Section Title",
                        type: "text",
                        required: true,
                        defaultValue: template.title.replace(' - Template', ''),
                        placeholder: "Enter section title"
                    },
                    {
                        name: "description",
                        label: "Description (Optional)",
                        type: "textarea",
                        required: false,
                        defaultValue: template.description || "",
                        placeholder: "Enter section description"
                    }
                ],
                submitText: "Create Section",
                cancelText: "Cancel"
            });

            if (!modalResult) {
                return { cancelled: true };
            }
            
            finalSectionData.title = modalResult.title;
            finalSectionData.description = modalResult.description;
        }
        
        // Create new section from template
        const newSectionData = {
            title: finalSectionData.title,
            order: await getNextSectionOrder(courseId),
            modules: deepCopyModules(template.modules || []),
            subSections: deepCopySubSections(template.subSections || []),
            description: finalSectionData.description || template.description || "",
            objectives: finalSectionData.objectives || template.objectives || [],
            tags: [...(template.tags || []).filter(tag => tag !== 'template')],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdFromTemplate: templateId
        };

        const newSectionRef = await addDoc(
            collection(db, "courses", courseId, "sections"),
            newSectionData
        );

        // Update template usage count
        await updateDoc(templateRef, {
            usageCount: (template.usageCount || 0) + 1,
            lastUsedAt: new Date().toISOString()
        });

        return {
            id: newSectionRef.id,
            ...newSectionData
        };
    } catch (error) {
        console.error("Error creating section from template:", error);
        throw new Error(`Failed to create section from template: ${error.message}`);
    }
};

// Make sure to export all functions at the bottom