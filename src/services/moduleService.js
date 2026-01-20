import { db } from "../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export const saveModule = async ({ courseId, sectionId, subSectionId, module, isNew, videoUrl }) => {
    console.log("🔧 SAVE MODULE DEBUG:");
    console.log("courseId:", courseId);
    console.log("sectionId:", sectionId);
    console.log("subSectionId:", subSectionId);
    console.log("Full module object:", JSON.stringify(module, null, 2));
    console.log("Module content:", module.content);
    console.log("Content length:", module.content?.length || 0);
    console.log("Content preview:", module.content?.substring(0, 200));
    console.log("isNew:", isNew);
    console.log("videoUrl:", videoUrl);
    
    if (!courseId || !sectionId) {
        throw new Error("Missing required parameters: courseId and sectionId are required");
    }
    
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const sectionSnap = await getDoc(sectionRef);
    
    if (!sectionSnap.exists()) {
        throw new Error(`Section not found: ${sectionId}`);
    }

    const sectionData = sectionSnap.data();
    console.log("Current section data (subsections count):", sectionData.subSections?.length || 0);
    
    let content = module.content || "";
    
    if (module.type === 'video' && videoUrl) {
        const youtubeId = extractYouTubeId(videoUrl);
        content = youtubeId || videoUrl;
        console.log("Video content processed:", content);
    }
    
    const updatedModule = { 
        ...module, 
        content: content, // Ensure content is never undefined
        updatedAt: new Date().toISOString()
    };
    
    console.log("Updated module data to save:", {
        id: updatedModule.id,
        title: updatedModule.title,
        type: updatedModule.type,
        contentLength: updatedModule.content?.length || 0,
        contentPreview: updatedModule.content?.substring(0, 100)
    });
    
    try {
        if (subSectionId) {
            // Save to sub-section
            console.log("Saving to sub-section:", subSectionId);
            const subSections = [...(sectionData.subSections || [])];
            const subSectionIndex = subSections.findIndex(s => s.id === subSectionId);
            
            console.log("Sub-section index:", subSectionIndex);
            console.log("Total sub-sections:", subSections.length);
            
            if (subSectionIndex === -1) {
                throw new Error(`Sub-section not found: ${subSectionId}. Available sub-sections: ${subSections.map(s => s.id).join(', ')}`);
            }
            
            // Create a deep copy of the sub-section
            const subSectionToUpdate = { ...subSections[subSectionIndex] };
            let modules = [...(subSectionToUpdate.modules || [])];
            
            // Log all modules to debug
            console.log("Current modules in sub-section:", modules.length);
            modules.forEach((mod, idx) => {
                console.log(`  ${idx}. ID: ${mod.id}, Title: "${mod.title}", Type: ${mod.type}`);
                console.log(`     Content length: ${mod.content?.length || 0}`);
            });
            
            if (isNew) {
                // Generate new ID for new module
                updatedModule.id = Date.now().toString();
                updatedModule.createdAt = new Date().toISOString();
                modules.push(updatedModule);
                console.log("Added new module. Total modules now:", modules.length);
            } else {
                // Update existing module
                console.log("Looking for module with ID:", module.id);
                const moduleIndex = modules.findIndex(m => m.id === module.id);
                
                if (moduleIndex === -1) {
                    console.log("Available module IDs:", modules.map(m => m.id));
                    throw new Error(`Module not found in sub-section: ${module.id}. Available IDs: ${modules.map(m => m.id).join(', ')}`);
                }
                
                console.log("Found module at index:", moduleIndex);
                modules[moduleIndex] = updatedModule;
                console.log("Updated existing module at index:", moduleIndex);
            }
            
            // Update the sub-section
            subSectionToUpdate.modules = modules;
            subSectionToUpdate.updatedAt = new Date().toISOString();
            subSections[subSectionIndex] = subSectionToUpdate;
            
            await updateDoc(sectionRef, { 
                subSections,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Module saved to sub-section successfully!");
            
        } else {
            // Save to main section
            console.log("Saving to main section");
            let modules = [...(sectionData.modules || [])];
            
            if (isNew) {
                // Generate new ID for new module
                updatedModule.id = Date.now().toString();
                updatedModule.createdAt = new Date().toISOString();
                modules.push(updatedModule);
                console.log("Added new module. Total modules now:", modules.length);
            } else {
                // Update existing module
                const moduleIndex = modules.findIndex(m => m.id === module.id);
                if (moduleIndex === -1) {
                    throw new Error(`Module not found in section: ${module.id}`);
                }
                modules[moduleIndex] = updatedModule;
                console.log("Updated existing module at index:", moduleIndex);
            }
            
            await updateDoc(sectionRef, { 
                modules,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Module saved to main section successfully!");
        }
        
        // Verify the save
        const updatedSection = await getDoc(sectionRef);
        const updatedData = updatedSection.data();
        console.log("✅ Save verification - Updated section data retrieved");
        
        if (subSectionId) {
            const updatedSubSection = updatedData.subSections?.find(s => s.id === subSectionId);
            if (updatedSubSection) {
                console.log("✅ Updated sub-section modules count:", updatedSubSection.modules?.length || 0);
                const savedModule = updatedSubSection.modules?.find(m => m.id === updatedModule.id);
                if (savedModule) {
                    console.log("✅ Found saved module with content length:", savedModule.content?.length || 0);
                }
            }
        }
        
        return updatedModule;
        
    } catch (error) {
        console.error("❌ Error saving module:", error);
        console.error("Error details:", {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        throw new Error(`Failed to save module: ${error.message}`);
    }
};

export const deleteModule = async (courseId, sectionId, subSectionId, moduleId) => {
    console.log("🗑️ Deleting module:", { courseId, sectionId, subSectionId, moduleId });
    
    if (!courseId || !sectionId || !moduleId) {
        throw new Error("Missing required parameters");
    }

    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const sectionSnap = await getDoc(sectionRef);
    
    if (!sectionSnap.exists()) {
        throw new Error("Section not found");
    }

    const sectionData = sectionSnap.data();
    
    try {
        if (subSectionId) {
            // Delete from sub-section
            const subSections = [...(sectionData.subSections || [])];
            const subSectionIndex = subSections.findIndex(s => s.id === subSectionId);
            
            if (subSectionIndex === -1) {
                throw new Error("Sub-section not found");
            }
            
            const subSectionToUpdate = { ...subSections[subSectionIndex] };
            const modules = (subSectionToUpdate.modules || []).filter(m => m.id !== moduleId);
            
            subSectionToUpdate.modules = modules;
            subSectionToUpdate.updatedAt = new Date().toISOString();
            subSections[subSectionIndex] = subSectionToUpdate;
            
            await updateDoc(sectionRef, { 
                subSections,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Module deleted from sub-section");
        } else {
            // Delete from main section
            const modules = (sectionData.modules || []).filter(m => m.id !== moduleId);
            await updateDoc(sectionRef, { 
                modules,
                updatedAt: new Date().toISOString()
            });
            console.log("✅ Module deleted from main section");
        }
        
        return true;
    } catch (error) {
        console.error("❌ Error deleting module:", error);
        throw new Error(`Failed to delete module: ${error.message}`);
    }
};

export const getModuleById = async (courseId, sectionId, subSectionId, moduleId) => {
    console.log("🔍 Getting module by ID:", { courseId, sectionId, subSectionId, moduleId });
    
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const sectionSnap = await getDoc(sectionRef);
    
    if (!sectionSnap.exists()) {
        throw new Error("Section not found");
    }

    const sectionData = sectionSnap.data();
    
    if (subSectionId) {
        // Get from sub-section
        const subSection = (sectionData.subSections || []).find(s => s.id === subSectionId);
        if (!subSection) {
            throw new Error("Sub-section not found");
        }
        
        // Look for module
        const module = (subSection.modules || []).find(m => m.id === moduleId);
        
        if (!module) {
            console.log("Available modules:", subSection.modules?.map(m => ({ id: m.id, title: m.title })));
            throw new Error(`Module not found in sub-section: ${moduleId}`);
        }
        
        console.log("🔍 Found module:", {
            id: module.id,
            title: module.title,
            type: module.type,
            contentLength: module.content?.length || 0,
            contentPreview: module.content?.substring(0, 100)
        });
        
        return {
            ...module,
            sectionId,
            subSectionId
        };
    } else {
        // Get from main section
        const module = (sectionData.modules || []).find(m => m.id === moduleId);
        
        if (!module) {
            throw new Error(`Module not found in section: ${moduleId}`);
        }
        
        return {
            ...module,
            sectionId
        };
    }
};

export const updateModuleOrder = async (courseId, sectionId, subSectionId, moduleIds) => {
    console.log("📋 Updating module order:", { courseId, sectionId, subSectionId, moduleIds });
    
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const sectionSnap = await getDoc(sectionRef);
    
    if (!sectionSnap.exists()) {
        throw new Error("Section not found");
    }

    const sectionData = sectionSnap.data();
    
    try {
        if (subSectionId) {
            // Update order in sub-section
            const subSections = [...(sectionData.subSections || [])];
            const subSectionIndex = subSections.findIndex(s => s.id === subSectionId);
            
            if (subSectionIndex === -1) {
                throw new Error("Sub-section not found");
            }
            
            const subSectionToUpdate = { ...subSections[subSectionIndex] };
            const modules = subSectionToUpdate.modules || [];
            
            // Reorder modules based on provided IDs
            const orderedModules = moduleIds.map(id => 
                modules.find(m => m.id === id)
            ).filter(Boolean);
            
            // Add any modules not in the ordered list (new modules)
            modules.forEach(module => {
                if (!orderedModules.find(m => m.id === module.id)) {
                    orderedModules.push(module);
                }
            });
            
            subSectionToUpdate.modules = orderedModules;
            subSectionToUpdate.updatedAt = new Date().toISOString();
            subSections[subSectionIndex] = subSectionToUpdate;
            
            await updateDoc(sectionRef, { 
                subSections,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Update order in main section
            const modules = sectionData.modules || [];
            
            // Reorder modules based on provided IDs
            const orderedModules = moduleIds.map(id => 
                modules.find(m => m.id === id)
            ).filter(Boolean);
            
            // Add any modules not in the ordered list
            modules.forEach(module => {
                if (!orderedModules.find(m => m.id === module.id)) {
                    orderedModules.push(module);
                }
            });
            
            await updateDoc(sectionRef, { 
                modules: orderedModules,
                updatedAt: new Date().toISOString()
            });
        }
        
        console.log("✅ Module order updated successfully");
        return true;
    } catch (error) {
        console.error("❌ Error updating module order:", error);
        throw new Error(`Failed to update module order: ${error.message}`);
    }
};

export const duplicateModule = async (courseId, sectionId, subSectionId, moduleId) => {
    console.log("📋 Duplicating module:", { courseId, sectionId, subSectionId, moduleId });
    
    try {
        const module = await getModuleById(courseId, sectionId, subSectionId, moduleId);
        
        const duplicatedModule = {
            ...module,
            id: Date.now().toString(),
            title: `${module.title} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        delete duplicatedModule.sectionId;
        delete duplicatedModule.subSectionId;
        
        await saveModule({
            courseId,
            sectionId,
            subSectionId,
            module: duplicatedModule,
            isNew: true,
            videoUrl: module.type === 'video' ? module.content : null
        });
        
        console.log("✅ Module duplicated successfully");
        return duplicatedModule;
    } catch (error) {
        console.error("❌ Error duplicating module:", error);
        throw new Error(`Failed to duplicate module: ${error.message}`);
    }
};

export const validateYouTubeUrl = (url) => {
    if (!url) return false;
    
    const youtubeId = extractYouTubeId(url);
    return !!youtubeId;
};

const extractYouTubeId = (url) => {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
        /youtu\.be\/([^?\n#]+)/,
        /youtube\.com\/embed\/([^?\n#]+)/,
        /youtube\.com\/v\/([^?\n#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            // Extract just the video ID (remove any additional parameters)
            const videoId = match[1].split(/[&#?]/)[0];
            if (videoId.length === 11) {
                return videoId;
            }
        }
    }
    
    return null;
};

export const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;
    
    return {
        default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
};

export const calculateModuleStats = (modules) => {
    const stats = {
        total: modules.length,
        video: modules.filter(m => m.type === 'video').length,
        text: modules.filter(m => m.type === 'text').length,
        quiz: modules.filter(m => m.type === 'quiz').length,
        totalDuration: 0,
        totalQuizzes: modules.filter(m => m.type === 'quiz').length,
        totalQuestions: modules.reduce((sum, module) => 
            sum + (module.quizData?.length || 0), 0
        )
    };
    
    return stats;
}

// Helper function to debug section structure
export const debugSectionStructure = async (courseId, sectionId) => {
    console.log("🔍 Debugging section structure...");
    
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const sectionSnap = await getDoc(sectionRef);
    
    if (!sectionSnap.exists()) {
        console.log("❌ Section does not exist");
        return null;
    }
    
    const data = sectionSnap.data();
    console.log("📊 SECTION STRUCTURE:");
    console.log("Section ID:", sectionId);
    console.log("Section title:", data.title || "No title");
    console.log("Total modules in main section:", data.modules?.length || 0);
    console.log("Total sub-sections:", data.subSections?.length || 0);
    
    if (data.subSections && data.subSections.length > 0) {
        console.log("\n📋 SUB-SECTIONS:");
        data.subSections.forEach((subSection, index) => {
            console.log(`  ${index + 1}. ID: ${subSection.id}`);
            console.log(`     Title: "${subSection.title || "No title"}"`);
            console.log(`     Modules: ${subSection.modules?.length || 0}`);
            if (subSection.modules && subSection.modules.length > 0) {
                subSection.modules.forEach((module, modIndex) => {
                    console.log(`       ${modIndex + 1}. ID: ${module.id}`);
                    console.log(`            Title: "${module.title}"`);
                    console.log(`            Type: ${module.type}`);
                    console.log(`            Content length: ${module.content?.length || 0}`);
                    console.log(`            Content preview: ${module.content?.substring(0, 100) || "Empty"}...`);
                });
            }
        });
    }
    
    if (data.modules && data.modules.length > 0) {
        console.log("\n📦 MAIN SECTION MODULES:");
        data.modules.forEach((module, index) => {
            console.log(`  ${index + 1}. ${module.id} - "${module.title}" (${module.type})`);
        });
    }
    
    return data;
};

// Debug function to find a specific module
export const debugFindModule = async (courseId, sectionId, subSectionId, moduleId) => {
    console.log("🔎 DEBUG FIND MODULE:", { courseId, sectionId, subSectionId, moduleId });
    
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const sectionSnap = await getDoc(sectionRef);
    
    if (!sectionSnap.exists()) {
        console.log("❌ Section does not exist");
        return null;
    }
    
    const data = sectionSnap.data();
    
    if (subSectionId) {
        const subSection = (data.subSections || []).find(s => s.id === subSectionId);
        if (!subSection) {
            console.log("❌ Sub-section not found");
            return null;
        }
        
        console.log(`✅ Found sub-section: "${subSection.title}"`);
        
        if (subSection.modules) {
            console.log(`📦 Total modules in sub-section: ${subSection.modules.length}`);
            
            const foundModule = subSection.modules.find(m => m.id === moduleId);
            if (foundModule) {
                console.log("🎯 FOUND MODULE:", foundModule);
                console.log("📝 Module content:", foundModule.content);
                console.log("📏 Content length:", foundModule.content?.length || 0);
                return foundModule;
            } else {
                console.log("❌ Module not found. Available modules:");
                subSection.modules.forEach((m, i) => {
                    console.log(`  ${i}. ID: ${m.id}, Title: "${m.title}", Content length: ${m.content?.length || 0}`);
                });
            }
        } else {
            console.log("❌ No modules in sub-section");
        }
    }
    
    return null;
};