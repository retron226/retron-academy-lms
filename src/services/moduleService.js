import { db } from "../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export const saveModule = async ({ courseId, sectionId, subSectionId, module, isNew, videoUrl }) => {
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const section = await getDoc(sectionRef);
    
    if (!section.exists()) {
        throw new Error("Section not found");
    }

    const sectionData = section.data();
    let content = module.content;
    
    if (module.type === 'video' && videoUrl) {
        const youtubeId = extractYouTubeId(videoUrl);
        content = youtubeId || videoUrl;
    }
    
    const updatedModule = { 
        ...module, 
        content,
        updatedAt: new Date().toISOString()
    };
    
    if (subSectionId) {
        // Save to sub-section
        const subSections = sectionData.subSections || [];
        const subSectionIndex = subSections.findIndex(s => s.id === subSectionId);
        
        if (subSectionIndex === -1) {
            throw new Error("Sub-section not found");
        }
        
        const subSection = subSections[subSectionIndex];
        let modules = subSection.modules || [];
        
        if (isNew) {
            updatedModule.id = Date.now().toString();
            updatedModule.createdAt = new Date().toISOString();
            modules.push(updatedModule);
        } else {
            modules = modules.map(m => m.id === module.id ? updatedModule : m);
        }
        
        subSections[subSectionIndex].modules = modules;
        
        await updateDoc(sectionRef, { 
            subSections,
            updatedAt: new Date().toISOString()
        });
    } else {
        // Save to main section
        let modules = sectionData.modules || [];
        
        if (isNew) {
            updatedModule.id = Date.now().toString();
            updatedModule.createdAt = new Date().toISOString();
            modules.push(updatedModule);
        } else {
            modules = modules.map(m => m.id === module.id ? updatedModule : m);
        }
        
        await updateDoc(sectionRef, { 
            modules,
            updatedAt: new Date().toISOString()
        });
    }
};

export const deleteModule = async (courseId, sectionId, subSectionId, moduleId) => {
    if (!courseId || !sectionId || !moduleId) {
        throw new Error("Missing required parameters");
    }

    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const section = await getDoc(sectionRef);
    
    if (!section.exists()) {
        throw new Error("Section not found");
    }

    const sectionData = section.data();
    
    try {
        if (subSectionId) {
            // Delete from sub-section
            const subSections = sectionData.subSections || [];
            const subSectionIndex = subSections.findIndex(s => s.id === subSectionId);
            
            if (subSectionIndex === -1) {
                throw new Error("Sub-section not found");
            }
            
            const subSection = subSections[subSectionIndex];
            const modules = (subSection.modules || []).filter(m => m.id !== moduleId);
            
            subSections[subSectionIndex].modules = modules;
            
            await updateDoc(sectionRef, { 
                subSections,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Delete from main section
            const modules = (sectionData.modules || []).filter(m => m.id !== moduleId);
            await updateDoc(sectionRef, { 
                modules,
                updatedAt: new Date().toISOString()
            });
        }
        
        return true;
    } catch (error) {
        console.error("Error deleting module:", error);
        throw new Error(`Failed to delete module: ${error.message}`);
    }
};

export const getModuleById = async (courseId, sectionId, subSectionId, moduleId) => {
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const section = await getDoc(sectionRef);
    
    if (!section.exists()) {
        throw new Error("Section not found");
    }

    const sectionData = section.data();
    
    if (subSectionId) {
        // Get from sub-section
        const subSection = (sectionData.subSections || []).find(s => s.id === subSectionId);
        if (!subSection) {
            throw new Error("Sub-section not found");
        }
        
        const module = (subSection.modules || []).find(m => m.id === moduleId);
        if (!module) {
            throw new Error("Module not found in sub-section");
        }
        
        return {
            ...module,
            sectionId,
            subSectionId
        };
    } else {
        // Get from main section
        const module = (sectionData.modules || []).find(m => m.id === moduleId);
        if (!module) {
            throw new Error("Module not found in section");
        }
        
        return {
            ...module,
            sectionId
        };
    }
};

export const updateModuleOrder = async (courseId, sectionId, subSectionId, moduleIds) => {
    const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
    const section = await getDoc(sectionRef);
    
    if (!section.exists()) {
        throw new Error("Section not found");
    }

    const sectionData = section.data();
    
    try {
        if (subSectionId) {
            // Update order in sub-section
            const subSections = sectionData.subSections || [];
            const subSectionIndex = subSections.findIndex(s => s.id === subSectionId);
            
            if (subSectionIndex === -1) {
                throw new Error("Sub-section not found");
            }
            
            const subSection = subSections[subSectionIndex];
            const modules = subSection.modules || [];
            
            // Reorder modules based on provided IDs
            const orderedModules = moduleIds.map(id => 
                modules.find(m => m.id === id)
            ).filter(Boolean);
            
            subSections[subSectionIndex].modules = orderedModules;
            
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
            
            await updateDoc(sectionRef, { 
                modules: orderedModules,
                updatedAt: new Date().toISOString()
            });
        }
        
        return true;
    } catch (error) {
        console.error("Error updating module order:", error);
        throw new Error(`Failed to update module order: ${error.message}`);
    }
};

export const duplicateModule = async (courseId, sectionId, subSectionId, moduleId) => {
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
        
        return duplicatedModule;
    } catch (error) {
        console.error("Error duplicating module:", error);
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