import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompetitorRanking, TeamRanking, Discipline, Team } from './models';
import { PDF_LOGO_DATA_URL } from './pdf-logo';

@Injectable({
  providedIn: 'root'
})
export class PdfReportService {

  // Lovačka paleta boja - ista kao src/styles.scss ($hunt-*), pretvorena u RGB za jsPDF
  // (koji ne razumije SCSS varijable/hex nego traži zaseban r,g,b poziv po boji).
  private readonly COLOR_GREEN_DARK: [number, number, number] = [27, 67, 50];
  private readonly COLOR_BROWN: [number, number, number] = [107, 68, 35];
  private readonly COLOR_RUST: [number, number, number] = [160, 82, 45];
  private readonly COLOR_GOLD: [number, number, number] = [201, 162, 39];
  private readonly COLOR_GOLD_LIGHT: [number, number, number] = [224, 194, 94];

  /**
   * Zaglavlje koje se ponavlja na svakom izvještaju koji se izvozi za javno isticanje (na ploču) -
   * traka u tamnozelenoj lovačkoj boji s pozlaćenim rubom, grb/logo udruge te naziv natjecanja,
   * po uzoru na header aplikacije (app.component.html). Vraća y-poziciju odmah ispod naslova
   * izvještaja, spremnu za nastavak sadržaja.
   */
  private drawBrandedHeader(doc: jsPDF, reportTitle: string): number {
    const pageWidth = doc.internal.pageSize.width;
    const bannerHeight = 32;

    doc.setFillColor(...this.COLOR_GREEN_DARK);
    doc.rect(0, 0, pageWidth, bannerHeight, 'F');
    doc.setFillColor(...this.COLOR_GOLD);
    doc.rect(0, bannerHeight - 1.5, pageWidth, 1.5, 'F');

    const logoSize = 20;
    const logoX = 12;
    const logoY = (bannerHeight - logoSize) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoX - 1.5, logoY - 1.5, logoSize + 3, logoSize + 3, 2, 2, 'F');
    doc.setDrawColor(...this.COLOR_GOLD);
    doc.setLineWidth(0.8);
    doc.roundedRect(logoX - 1.5, logoY - 1.5, logoSize + 3, logoSize + 3, 2, 2, 'S');
    try {
      doc.addImage(PDF_LOGO_DATA_URL, 'JPEG', logoX, logoY, logoSize, logoSize);
    } catch {
      // Logo je kozmetički dodatak - ako iz bilo kojeg razloga ne uspije učitati, izvještaj se
      // svejedno mora izvesti.
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text(this.normalizeText('MEMORIJAL DRAGUTIN CENKO'), pageWidth / 2, 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...this.COLOR_GOLD_LIGHT);
    doc.text(this.normalizeText('LD Patka Donji Vidovec-Sveta Marija'), pageWidth / 2, 23, { align: 'center' });

    let y = bannerHeight + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...this.COLOR_GREEN_DARK);
    doc.text(this.normalizeText(reportTitle), pageWidth / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    return y + 8;
  }

  // Broj gađanja/bacaja po disciplini na papirnatom "startnom listu" (vidi
  // docs/Startni list za udruge muški.pdf i .../žene.pdf) - ovo je broj STUPACA na obrascu koji
  // sudac ručno popunjava, NE isto što i discipline.maxPoints (npr. ZRAČNA PUŠKA ima 10 gađanja
  // za muškarce, ali samo 5 za žene, iako je maxPoints 50 za obje kategorije). Nema polja u
  // modelu za ovo jer se tiče isključivo izgleda tiskanog obrasca, a ne bodovne formule. Za
  // nepoznatu disciplinu (nije na popisu) koristi se fallback od 5 stupaca.
  private readonly STARTING_LIST_SHOT_COLUMNS: { [category: string]: { [disciplineName: string]: number } } = {
    'M': { 'TRAP': 5, 'ZRAČNA PUŠKA': 10, 'PRAČKA': 5 },
    'Ž': { 'ZRAČNA PUŠKA': 5, 'PRAČKA': 5, 'PIKADO': 5 }
  };

  /**
   * Normalizes Croatian text by replacing palatals with regular letters
   * for better PDF compatibility
   */
  private normalizeText(text: string): string {
    if (!text) return text;

    const replacements: { [key: string]: string } = {
      // Lowercase palatals
      'č': 'c',
      'ć': 'c',
      'đ': 'd',
      'š': 's',
      'ž': 'z',
      // Uppercase palatals
      'Č': 'C',
      'Ć': 'C',
      'Đ': 'D',
      'Š': 'S',
      'Ž': 'Z'
    };

    return text.replace(/[čćđšžČĆĐŠŽ]/g, (match) => replacements[match] || match);
  }

  /**
   * Prints one line per row that carries a tieNote under an optional subheading, starting at
   * (x, y); returns the y position after the block. Advances to a new page mid-list if a long
   * list would overflow the current one. No-op (returns y unchanged) if nothing in the list is
   * tied.
   */
  private writeTieNoteLines(
    doc: jsPDF,
    rows: { rank: number; tieNote?: string; name: string }[],
    x: number,
    y: number,
    maxWidth: number,
    heading: string
  ): number {
    const tied = rows.filter(r => r.tieNote);
    if (tied.length === 0) return y;

    if (heading) {
      doc.setFontSize(11);
      doc.setTextColor(...this.COLOR_RUST);
      doc.text(this.normalizeText(heading), x, y);
      y += 7;
    }

    doc.setFontSize(8);
    doc.setTextColor(80);
    for (const row of tied) {
      if (y > doc.internal.pageSize.height - 20) {
        doc.addPage();
        y = 20;
      }
      const lines = doc.splitTextToSize(this.normalizeText(`${row.rank}. ${row.name}: ${row.tieNote}`), maxWidth);
      doc.text(lines, x, y);
      y += lines.length * 4 + 2;
    }

    return y + 4;
  }

  /**
   * Opisuje, riječima, točno pravilo po kojem se određuje poredak - i za osnovni slučaj (ukupni
   * bodovi) i za razbijanje izjednačenja (kaskada disciplina, vidi CompetitionService.TIEBREAK_CASCADES).
   * Ispisuje se uvijek (bez obzira ima li stvarnih izjednačenja u ovom izvještaju) kako bi svaki
   * natjecatelj mogao sam provjeriti zašto je pozicioniran gdje jest. `category` je 'M', 'Ž' ili
   * '' (sve kategorije, pa se navode oba pravila). `includeTeamSumNote` dodaje napomenu da se za
   * ekipni poredak prvo zbrajaju rezultati svih članova ekipe po disciplini (koristi se u ekipnom
   * i kompletnom izvještaju, ne u čisto pojedinačnom).
   */
  private generalRankingRuleLines(category: string, includeTeamSumNote: boolean): string[] {
    const lines: string[] = [
      '1) Poredak se određuje prema ukupnom broju bodova, od najvišeg prema najnižem.',
      '2) Ukupni bodovi zbrajaju se iz svih disciplina kategorije, pri čemu svaka disciplina nosi maksimalno 100 bodova, po formuli:'
    ];
    if (category === 'M' || !category) {
      lines.push('    - Muškarci: TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20');
    }
    if (category === 'Ž' || !category) {
      lines.push('    - Žene: ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,3333... (točno 100/300, ne zaokruženo)');
    }
    if (includeTeamSumNote) {
      lines.push('    Za ekipni poredak prvo se zbroje rezultati svih članova ekipe u svakoj disciplini, a zatim se na taj zbroj primijeni gornja formula.');
    }
    lines.push('3) Ako dva ili više natjecatelja/ekipa imaju jednak ukupan broj bodova, izjednačenje se razbija usporedbom rezultata u sljedećim disciplinama, tim redoslijedom, sve dok se ne pronađe razlika:');
    if (category === 'M' || !category) {
      lines.push('    - Muškarci: TRAP, zatim PRAČKA, zatim ZRAČNA PUŠKA');
    }
    if (category === 'Ž' || !category) {
      lines.push('    - Žene: PRAČKA, zatim ZRAČNA PUŠKA, zatim PIKADO');
    }
    lines.push('4) Ako je rezultat identičan u svim navedenim disciplinama i izjednačenje se odnosi na plasman unutar prva tri mjesta (npr. 1. i 2., 2. i 3., ili 1., 2. i 3. mjesto), o konačnom poretku odlučuje raspucavanje - dodatno gađanje discipline PRAČKA na 5 meta.');
    lines.push('5) Izvan prva tri mjesta, ako izjednačenje ostane neriješeno ni nakon usporedbe po disciplinama, poredak unutar te skupine je proizvoljan.');
    return lines;
  }

  /**
   * Uvijek dodaje zasebnu stranicu na kraju izvještaja s objašnjenjem pravila poretka (vidi
   * generalRankingRuleLines), a zatim - ako postoje stvarna izjednačenja - i konkretnu bilješku
   * po natjecatelju/ekipi (vidi writeTieNoteLines), za punu transparentnost prema natjecateljima
   * zašto je netko ispred, odnosno iza, nekoga.
   */
  private addTieNotesPage(
    doc: jsPDF,
    sections: { heading: string; rows: { rank: number; tieNote?: string; name: string }[] }[],
    category: string,
    includeTeamSumNote: boolean
  ): void {
    doc.addPage();
    let y = 20;

    doc.setFontSize(14);
    doc.setTextColor(...this.COLOR_GREEN_DARK);
    doc.text(this.normalizeText('Napomene o poretku'), 15, y);
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(60);
    for (const line of this.generalRankingRuleLines(category, includeTeamSumNote)) {
      const wrapped = doc.splitTextToSize(this.normalizeText(line), 180);
      doc.text(wrapped, 15, y);
      y += wrapped.length * 4 + 2;
    }
    y += 6;

    const hasAnyTie = sections.some(s => s.rows.some(r => r.tieNote));
    if (hasAnyTie) {
      doc.setFontSize(12);
      doc.setTextColor(...this.COLOR_RUST);
      doc.text(this.normalizeText('Izjednačeni rezultati u ovom izvještaju:'), 15, y);
      y += 8;

      for (const section of sections) {
        y = this.writeTieNoteLines(doc, section.rows, 15, y, 180, section.heading);
      }
    }
  }

  exportIndividualRankingToPdf(
    data: CompetitorRanking[],
    disciplines: Discipline[],
    category: string
  ): void {
    const doc = new jsPDF();
    const disciplineColumns = disciplines.map(d => this.normalizeText(d.name));
    const originalDisciplineNames = disciplines.map(d => d.name); // Keep original names for data access

    // Header
    let textY = this.drawBrandedHeader(doc, 'Pojedinačni poredak');

    if (category) {
      doc.setFontSize(14);
      doc.setTextColor(100);
      const categoryText = category === 'M' ? 'Kategorija: Muskarci' : 'Kategorija: Zene';
      doc.text(this.normalizeText(categoryText), 105, textY, { align: 'center' });
      textY += 10;
    }

    // Formula explanation
    if (category) {
      doc.setFontSize(10);
      doc.setTextColor(60);
      const formula = category === 'M'
        ? 'Formula bodovanja: TRAP × 20 + ZRACNA PUSKA × 2 + PRACKA × 20'
        : 'Formula bodovanja: ZRACNA PUSKA × 2 + PRACKA × 20 + PIKADO × 0,3333... (100/300, ne zaokruzeno)';
      doc.text(this.normalizeText(formula), 105, textY, { align: 'center' });
      textY += 10;
    }

    // Prepare table data - normalize all text content
    const columns = [
      'Rang',
      'Ime i Prezime',
      'Tim',
      ...disciplineColumns,
      'Ukupno'
    ].map(col => this.normalizeText(col));

    const rows = data.map(row => [
      row.rank.toString(),
      this.normalizeText(`${row.competitor.firstName} ${row.competitor.lastName}`),
      this.normalizeText(row.team),
      ...originalDisciplineNames.map(disciplineName => (row.disciplineScores[disciplineName] || 0).toString()),
      row.totalPoints.toFixed(2)
    ]);

    // Generate table
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: textY,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: this.COLOR_GREEN_DARK,
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

    // Napomene o izjednačenim rezultatima, na zasebnoj stranici (transparentnost: zašto je netko ispred nekoga)
    const tieRows = data.map(row => ({
      rank: row.rank,
      tieNote: row.tieNote,
      name: `${row.competitor.firstName} ${row.competitor.lastName}`
    }));
    this.addTieNotesPage(doc, [{ heading: '', rows: tieRows }], category, false);

    // Footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const date = new Date().toLocaleDateString('hr-HR');
      doc.text(this.normalizeText(`Izvještaj generiran: ${date}`), 15, doc.internal.pageSize.height - 10);
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
    const disciplineColumns = disciplines.map(d => this.normalizeText(d.name));
    const originalDisciplineNames = disciplines.map(d => d.name); // Keep original names for data access

    // Header
    let textY = this.drawBrandedHeader(doc, 'Ekipni poredak');

    if (category) {
      doc.setFontSize(14);
      doc.setTextColor(100);
      const categoryText = category === 'M' ? 'Kategorija: Muškarci' : 'Kategorija: Žene';
      doc.text(this.normalizeText(categoryText), 105, textY, { align: 'center' });
      textY += 10;
    }

    // Formula explanation
    if (category) {
      doc.setFontSize(10);
      doc.setTextColor(60);
      const formula = category === 'M'
        ? 'Formula bodovanja (zbroj svih članova): TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20'
        : 'Formula bodovanja (zbroj svih članova): ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,3333... (100/300, ne zaokruženo)';
      doc.text(this.normalizeText(formula), 105, textY, { align: 'center' });
      textY += 10;
    }

    // Prepare table data - normalize all text content
    const columns = [
      'Rang',
      'Naziv Ekipe',
      ...disciplineColumns,
      'Ukupno'
    ].map(col => this.normalizeText(col));

    const rows = data.map(row => [
      row.rank.toString(),
      this.normalizeText(row.team.name),
      ...originalDisciplineNames.map(disciplineName => (row.disciplineScores[disciplineName] || 0).toString()),
      row.totalPoints.toFixed(2)
    ]);

    // Generate table
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: textY,
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: this.COLOR_BROWN,
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
    doc.setTextColor(...this.COLOR_BROWN);
    doc.text(this.normalizeText('Sastav Ekipa:'), 15, currentY);
    currentY += 10;

    doc.setFontSize(9);
    doc.setTextColor(60);

    data.forEach(teamRanking => {
      if (currentY > doc.internal.pageSize.height - 30) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(this.normalizeText(`${teamRanking.rank}. ${teamRanking.team.name}:`), 15, currentY);
      doc.setFont('helvetica', 'normal');

      const members = teamRanking.team.members.map(m => this.normalizeText(`${m.firstName} ${m.lastName}`)).join(', ');
      const lines = doc.splitTextToSize(members, 180);
      doc.text(lines, 25, currentY + 5);
      currentY += 5 + (lines.length * 4) + 5;
    });

    // Napomene o izjednačenim rezultatima, na zasebnoj stranici (transparentnost: zašto je netko ispred nekoga)
    const tieRows = data.map(row => ({ rank: row.rank, tieNote: row.tieNote, name: row.team.name }));
    this.addTieNotesPage(doc, [{ heading: '', rows: tieRows }], category, true);

    // Footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const date = new Date().toLocaleDateString('hr-HR');
      doc.text(this.normalizeText(`Izvještaj generiran: ${date}`), 15, doc.internal.pageSize.height - 10);
      doc.text(`Stranica ${i} od ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }

    // Save the PDF - normalize filename as well
    const filename = this.normalizeText(`ekipni-poredak${category ? '-' + category : ''}-${new Date().toISOString().split('T')[0]}.pdf`);
    doc.save(filename);
  }

  exportCompleteReportToPdf(
    individualData: CompetitorRanking[],
    teamData: TeamRanking[],
    disciplines: Discipline[],
    category: string
  ): void {
    const doc = new jsPDF();
    const disciplineColumns = disciplines.map(d => this.normalizeText(d.name));
    const originalDisciplineNames = disciplines.map(d => d.name); // Keep original names for data access

    // Main header
    let currentY = this.drawBrandedHeader(doc, 'Kompletan izvještaj rezultata');

    const date = new Date().toLocaleDateString('hr-HR');
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(this.normalizeText(`Datum: ${date}`), 105, currentY, { align: 'center' });
    currentY += 10;

    if (category) {
      const categoryText = category === 'M' ? 'Kategorija: Muškarci' : 'Kategorija: Žene';
      doc.text(this.normalizeText(categoryText), 105, currentY, { align: 'center' });
      currentY += 10;
    }

    currentY += 5;
    let individualTieRows: { rank: number; tieNote?: string; name: string }[] = [];
    let teamTieRows: { rank: number; tieNote?: string; name: string }[] = [];

    // Individual ranking
    if (individualData.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(...this.COLOR_GREEN_DARK);
      doc.text(this.normalizeText('Pojedinačni Poredak'), 15, currentY);
      currentY += 10;

      const columns = ['Rang', 'Ime', 'Tim', ...disciplineColumns, 'Ukupno'].map(col => this.normalizeText(col));
      const topIndividual = individualData.slice(0, 10);
      const rows = topIndividual.map(row => [
        row.rank.toString(),
        this.normalizeText(`${row.competitor.firstName} ${row.competitor.lastName}`),
        this.normalizeText(row.team),
        ...originalDisciplineNames.map(disciplineName => (row.disciplineScores[disciplineName] || 0).toString()),
        row.totalPoints.toFixed(2)
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: currentY,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: this.COLOR_GREEN_DARK },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          [columns.length - 1]: { halign: 'right', fontStyle: 'bold' }
        }
      });

      individualTieRows = topIndividual.map(row => ({
        rank: row.rank,
        tieNote: row.tieNote,
        name: `${row.competitor.firstName} ${row.competitor.lastName}`
      }));
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Team ranking
    if (teamData.length > 0) {
      if (currentY > doc.internal.pageSize.height - 60) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(...this.COLOR_BROWN);
      doc.text(this.normalizeText('Ekipni Poredak'), 15, currentY);
      currentY += 10;

      const columns = ['Rang', 'Ekipa', ...disciplineColumns, 'Ukupno'].map(col => this.normalizeText(col));
      const topTeams = teamData.slice(0, 10);
      const rows = topTeams.map(row => [
        row.rank.toString(),
        this.normalizeText(row.team.name),
        ...originalDisciplineNames.map(disciplineName => (row.disciplineScores[disciplineName] || 0).toString()),
        row.totalPoints.toFixed(2)
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: currentY,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: this.COLOR_BROWN },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          [columns.length - 1]: { halign: 'right', fontStyle: 'bold' }
        }
      });

      teamTieRows = topTeams.map(row => ({ rank: row.rank, tieNote: row.tieNote, name: row.team.name }));
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Napomene o izjednačenim rezultatima, na zasebnoj stranici na kraju izvještaja
    this.addTieNotesPage(doc, [
      { heading: 'Pojedinačni poredak:', rows: individualTieRows },
      { heading: 'Ekipni poredak:', rows: teamTieRows }
    ], category, true);

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(this.normalizeText(`Kompletan izvještaj generiran: ${date}`), 15, doc.internal.pageSize.height - 10);
      doc.text(`Stranica ${i} od ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }

    // Save the PDF - normalize filename
    const filename = this.normalizeText(`kompletan-izvjestaj${category ? '-' + category : ''}-${new Date().toISOString().split('T')[0]}.pdf`);
    doc.save(filename);
  }

  /**
   * Jedan "startni list" (prazan zapisnik za popunjavanje bodova na licu mjesta) po ekipi PO
   * disciplini - zaglavlje (naziv natjecanja + naziv ekipe) se ponavlja ispred SVAKE tablice, ne
   * samo jednom na vrhu, jer se list reže škarama po disciplinama i svaki dio nosi sudac na svoju
   * poziciju - mora odmah vidjeti koja mu je ekipa stigla bez da gleda ostatak lista. Naziv ekipe
   * i popis natjecatelja su unaprijed ispisani, a stupci s bodovima ostaju prazni jer ih suci
   * ručno ispisuju na natjecanju. Format prati postojeće papirnate obrasce, vidi
   * docs/Startni list za udruge muški.pdf i docs/Startni list za udruge ženske.pdf.
   */
  exportStartingListsToPdf(teams: Team[], disciplines: Discipline[], category: 'M' | 'Ž'): void {
    if (teams.length === 0) return;

    const doc = new jsPDF();
    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name, 'hr'));
    const shotColumnsForCategory = this.STARTING_LIST_SHOT_COLUMNS[category] || {};
    let isFirstBlock = true;
    let y = 15;

    sortedTeams.forEach((team) => {
      for (const discipline of disciplines) {
        const shotColumns = shotColumnsForCategory[discipline.name] || 5;

        // Svaki blok (zaglavlje + tablica + potpisi) treba otprilike 90mm - ako ne stane na
        // trenutnu stranicu, nastavi na sljedećoj umjesto da ga prereže na pola.
        if (!isFirstBlock) {
          if (y > doc.internal.pageSize.height - 90) {
            doc.addPage();
            y = 15;
          } else {
            // Isprekidana linija kao vodilja za rezanje škarama između dva bloka na istoj stranici.
            doc.setLineDashPattern([1, 1], 0);
            doc.line(10, y, doc.internal.pageSize.width - 10, y);
            doc.setLineDashPattern([], 0);
            y += 8;
          }
        }
        isFirstBlock = false;

        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(this.normalizeText('LD PATKA Donji Vidovec-Sveta Marija'), 105, y, { align: 'center' });
        y += 10;

        autoTable(doc, {
          startY: y,
          theme: 'grid',
          body: [[
            this.normalizeText('MEMORIJAL\nDRAGUTIN CENKO'),
            `${this.normalizeText('Naziv ekipe / UDRUGE')}\n\n${this.normalizeText(team.name)}`
          ]],
          styles: { fontSize: 10, cellPadding: 4, halign: 'center', valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.2 },
          columnStyles: {
            0: { cellWidth: 42, fillColor: [235, 235, 235], fontStyle: 'bold' },
            1: { cellWidth: 135, fontStyle: 'bold' }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 12;

        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(this.normalizeText('Z A P I S N I K'), 105, y, { align: 'center' });
        y += 6;

        const shotHeaders = Array.from({ length: shotColumns }, (_, i) => (i + 1).toString());
        const columns = ['R.br.', this.normalizeText('Ime i prezime'), '', ...shotHeaders, 'Ukupno'];

        // Uvijek točno 3 retka (ekipa ima do 3 člana) - prazan redak ostaje za natjecatelja koji
        // još nije prijavljen, sudac ga ručno upisuje na licu mjesta.
        const rows = [0, 1, 2].map(memberIndex => {
          const member = team.members[memberIndex];
          const name = member ? this.normalizeText(`${member.firstName} ${member.lastName}`) : '';
          return [
            (memberIndex + 1).toString(),
            name,
            this.normalizeText(discipline.name),
            ...Array(shotColumns).fill(''),
            ''
          ];
        });

        autoTable(doc, {
          startY: y,
          head: [columns],
          body: rows,
          foot: [[{ content: this.normalizeText('Sveukupno'), colSpan: 3 + shotColumns, styles: { halign: 'right', fontStyle: 'bold' } }, '']],
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 2, halign: 'center', valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.2 },
          headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
          footStyles: { fillColor: [255, 255, 255], textColor: 0, lineColor: [0, 0, 0], lineWidth: 0.2 },
          columnStyles: {
            1: { halign: 'left', cellWidth: 40 },
            2: { fontSize: 7, cellWidth: 22 }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.text(this.normalizeText('Sudac:'), 160, y);
        y += 12;
        doc.text(this.normalizeText('Za ekipu: ________________________'), 25, y);
        y += 12;
      }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(128);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Stranica ${i} od ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }

    const categoryLabel = category === 'M' ? 'muskarci' : 'zene';
    const filename = `startni-listovi-${categoryLabel}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }
}
