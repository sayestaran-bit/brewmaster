import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Utility to generate a PDF label for a beer recipe.
 */
export const generateRecipeLabel = (recipe) => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [100, 150] // 10x15cm Label size
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;

    // Header Color Strip
    doc.setFillColor(245, 158, 11); // Amber-500
    doc.rect(0, 0, pageWidth, 20, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BREWMASTER", pageWidth / 2, 13, { align: "center" });

    // Recipe Name
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFont("helvetica", "black");
    doc.setFontSize(22);
    const splitTitle = doc.splitTextToSize(recipe.name || "Sin Nombre", pageWidth - (margin * 2));
    doc.text(splitTitle, pageWidth / 2, 38, { align: "center" });

    // Style
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`${recipe.style || "Estilo No Definido"}`, pageWidth / 2, 50, { align: "center" });

    // Technical Specs Grid
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, 58, pageWidth - margin, 58);

    const specs = [
        { label: "ABV", value: `${recipe.abv || 0}%` },
        { label: "IBU", value: recipe.ibu || 0 },
        { label: "OG", value: recipe.og || 0 },
        { label: "COLOR", value: `${recipe.colorSRM || 0} SRM` }
    ];

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    specs.forEach((spec, i) => {
        const x = margin + (i * ((pageWidth - (margin * 2)) / 4));
        const cellCenter = x + ((pageWidth - (margin * 2)) / 8);
        doc.setFont("helvetica", "black");
        doc.text(spec.value.toString(), cellCenter, 68, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(spec.label, cellCenter, 73, { align: "center" });
        doc.setFontSize(10);
    });

    doc.line(margin, 78, pageWidth - margin, 78);

    // Description / Ingredients Summary
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // Slate-600
    const descText = recipe.description || "Receta artesanal diseñada en BrewMaster.";
    const splitDesc = doc.splitTextToSize(descText, pageWidth - (margin * 4));
    doc.text(splitDesc, pageWidth / 2, 88, { align: "center" });

    // Footer Branding
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(margin, 115, pageWidth - (margin * 2), 25, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("BREWMASTER APP", margin + 5, 123);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Analítica y Control de Calidad", margin + 5, 127);

    // Date
    const today = new Date().toLocaleDateString();
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Envasado: ${today}`, margin + 5, 135);

    // QR Placeholder (Decorative)
    doc.setDrawColor(203, 213, 225);
    doc.rect(pageWidth - margin - 20, 117, 15, 15);
    doc.setFontSize(5);
    doc.text("BATCH INFO", pageWidth - margin - 12.5, 134, { align: "center" });

    // Save PDF
    const filename = `${(recipe.name || "receta").replace(/\s+/g, "_")}_etiqueta.pdf`;
    doc.save(filename);
};
