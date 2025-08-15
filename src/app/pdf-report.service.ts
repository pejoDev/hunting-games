import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompetitorRanking, TeamRanking, Discipline } from './models';

@Injectable({
  providedIn: 'root'
})
export class PdfReportService {

  exportIndividualRankingToPdf(
    data: CompetitorRanking[],
    disciplines: Discipline[],
    category: string
  ): void {
    const doc = new jsPDF();
    const disciplineColumns = disciplines.map(d => d.name);

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('LOVAČKO NATJECANJE', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text('Pojedinačni Poredak', 105, 30, { align: 'center' });

    if (category) {
      doc.setFontSize(14);
      doc.setTextColor(100);
      const categoryText = category === 'M' ? 'Kategorija: Muškarci' : 'Kategorija: Žene';
      doc.text(categoryText, 105, 40, { align: 'center' });
    }

    // Formula explanation
    if (category) {
      doc.setFontSize(10);
      doc.setTextColor(60);
      const formula = category === 'M'
        ? 'Formula bodovanja: TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20'
        : 'Formula bodovanja: ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,33';
      doc.text(formula, 105, 50, { align: 'center' });
    }

    // Prepare table data
    const columns = [
      'Rang',
      'Ime i Prezime',
      'Tim',
      ...disciplineColumns,
      'Ukupno'
    ];

    const rows = data.map(row => [
      row.rank.toString(),
      `${row.competitor.firstName} ${row.competitor.lastName}`,
      row.team,
      ...disciplineColumns.map(discipline => (row.disciplineScores[discipline] || 0).toString()),
      row.totalPoints.toFixed(2)
    ]);

    // Generate table
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: category ? 60 : 50,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }, // Rang
        [columns.length - 1]: { halign: 'right', fontStyle: 'bold' } // Ukupno
      },
      didParseCell: (data) => {
        // Highlight top 3 positions
        if (data.column.index === 0 && data.section === 'body') {
          const rank = parseInt(data.cell.text[0]);
          if (rank === 1) {
            data.cell.styles.fillColor = [255, 215, 0]; // Gold
            data.cell.styles.textColor = [0, 0, 0];
          } else if (rank === 2) {
            data.cell.styles.fillColor = [192, 192, 192]; // Silver
            data.cell.styles.textColor = [0, 0, 0];
          } else if (rank === 3) {
            data.cell.styles.fillColor = [205, 127, 50]; // Bronze
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const date = new Date().toLocaleDateString('hr-HR');
      doc.text(`Izvještaj generiran: ${date}`, 15, doc.internal.pageSize.height - 10);
      doc.text(`Stranica ${i} od ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    const filename = `pojedinacni-poredak${category ? '-' + category : ''}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  exportTeamRankingToPdf(
    data: TeamRanking[],
    disciplines: Discipline[],
    category: string
  ): void {
    const doc = new jsPDF();
    const disciplineColumns = disciplines.map(d => d.name);

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('LOVAČKO NATJECANJE', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text('Ekipni Poredak', 105, 30, { align: 'center' });

    if (category) {
      doc.setFontSize(14);
      doc.setTextColor(100);
      const categoryText = category === 'M' ? 'Kategorija: Muškarci' : 'Kategorija: Žene';
      doc.text(categoryText, 105, 40, { align: 'center' });
    }

    // Formula explanation
    if (category) {
      doc.setFontSize(10);
      doc.setTextColor(60);
      const formula = category === 'M'
        ? 'Formula bodovanja (zbroj svih članova): TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20'
        : 'Formula bodovanja (zbroj svih članova): ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,33';
      doc.text(formula, 105, 50, { align: 'center' });
    }

    // Prepare table data
    const columns = [
      'Rang',
      'Naziv Ekipe',
      ...disciplineColumns,
      'Ukupno'
    ];

    const rows = data.map(row => [
      row.rank.toString(),
      row.team.name,
      ...disciplineColumns.map(discipline => (row.disciplineScores[discipline] || 0).toString()),
      row.totalPoints.toFixed(2)
    ]);

    // Generate table
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: category ? 60 : 50,
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }, // Rang
        [columns.length - 1]: { halign: 'right', fontStyle: 'bold' } // Ukupno
      },
      didParseCell: (data) => {
        // Highlight top 3 positions
        if (data.column.index === 0 && data.section === 'body') {
          const rank = parseInt(data.cell.text[0]);
          if (rank === 1) {
            data.cell.styles.fillColor = [255, 215, 0]; // Gold
            data.cell.styles.textColor = [0, 0, 0];
          } else if (rank === 2) {
            data.cell.styles.fillColor = [192, 192, 192]; // Silver
            data.cell.styles.textColor = [0, 0, 0];
          } else if (rank === 3) {
            data.cell.styles.fillColor = [205, 127, 50]; // Bronze
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    // Add team members details if space allows
    let currentY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Sastav Ekipa:', 15, currentY);
    currentY += 10;

    doc.setFontSize(9);
    doc.setTextColor(60);

    data.forEach(teamRanking => {
      if (currentY > doc.internal.pageSize.height - 30) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`${teamRanking.rank}. ${teamRanking.team.name}:`, 15, currentY);
      doc.setFont('helvetica', 'normal');

      const members = teamRanking.team.members.map(m => `${m.firstName} ${m.lastName}`).join(', ');
      const lines = doc.splitTextToSize(members, 180);
      doc.text(lines, 25, currentY + 5);
      currentY += 5 + (lines.length * 4) + 5;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const date = new Date().toLocaleDateString('hr-HR');
      doc.text(`Izvještaj generiran: ${date}`, 15, doc.internal.pageSize.height - 10);
      doc.text(`Stranica ${i} od ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    const filename = `ekipni-poredak${category ? '-' + category : ''}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  exportCompleteReportToPdf(
    individualData: CompetitorRanking[],
    teamData: TeamRanking[],
    disciplines: Discipline[],
    category: string
  ): void {
    const doc = new jsPDF();
    const disciplineColumns = disciplines.map(d => d.name);

    // Main header
    doc.setFontSize(24);
    doc.setTextColor(40);
    doc.text('LOVAČKO NATJECANJE', 105, 25, { align: 'center' });

    doc.setFontSize(18);
    doc.text('Kompletan Izvještaj Rezultata', 105, 35, { align: 'center' });

    const date = new Date().toLocaleDateString('hr-HR');
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Datum: ${date}`, 105, 45, { align: 'center' });

    if (category) {
      const categoryText = category === 'M' ? 'Kategorija: Muškarci' : 'Kategorija: Žene';
      doc.text(categoryText, 105, 55, { align: 'center' });
    }

    let currentY = 70;

    // Individual ranking
    if (individualData.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(41, 128, 185);
      doc.text('Pojedinačni Poredak', 15, currentY);
      currentY += 10;

      const columns = ['Rang', 'Ime', 'Tim', ...disciplineColumns, 'Ukupno'];
      const rows = individualData.slice(0, 10).map(row => [
        row.rank.toString(),
        `${row.competitor.firstName} ${row.competitor.lastName}`,
        row.team,
        ...disciplineColumns.map(discipline => (row.disciplineScores[discipline] || 0).toString()),
        row.totalPoints.toFixed(2)
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: currentY,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          [columns.length - 1]: { halign: 'right', fontStyle: 'bold' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Team ranking
    if (teamData.length > 0) {
      if (currentY > doc.internal.pageSize.height - 60) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(76, 175, 80);
      doc.text('Ekipni Poredak', 15, currentY);
      currentY += 10;

      const columns = ['Rang', 'Ekipa', ...disciplineColumns, 'Ukupno'];
      const rows = teamData.slice(0, 10).map(row => [
        row.rank.toString(),
        row.team.name,
        ...disciplineColumns.map(discipline => (row.disciplineScores[discipline] || 0).toString()),
        row.totalPoints.toFixed(2)
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: currentY,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [76, 175, 80] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          [columns.length - 1]: { halign: 'right', fontStyle: 'bold' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Kompletan izvještaj generiran: ${date}`, 15, doc.internal.pageSize.height - 10);
      doc.text(`Stranica ${i} od ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    const filename = `kompletan-izvjestaj${category ? '-' + category : ''}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }
}
