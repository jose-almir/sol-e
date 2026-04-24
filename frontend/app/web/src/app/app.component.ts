import { Component, OnDestroy } from '@angular/core';
import { Subject, concatMap, from, takeUntil } from 'rxjs';
import { ExtractorService, Query } from './shared/services/extractor.service';
import { UtilsService } from './shared/services/utils.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  constructor(
    private extractorService: ExtractorService,
    private utilsService: UtilsService
  ) {}

  today = new Date();
  years = this.utilsService.years;
  days = this.utilsService.days;
  langs = this.utilsService.langs;

  refs: string = '';
  total = 0;
  extractedCount = 0;
  percentage = '0%';

  extractionStatus: 'start' | 'searching' | 'confirm' | 'extracting' | 'error' | 'empty' | 'result' = 'start';
  pendingStatus: import('./shared/services/extractor.service').QueryStatus | null = null;
  cancelExtraction$ = new Subject<void>();
  progressText = 'Processando...';

  ngOnDestroy() {
    this.cancelExtraction$.next();
    this.cancelExtraction$.complete();
  }

  query: Query = {
    query: '',
    fromDay: '',
    fromMonth: '',
    fromYear: '',
    toDay: '',
    toMonth: '',
    toYear: '',
    langs: [false, false, false],
  };

  fromDate: string = '';
  toDate: string = '';

  export() {
    saveAs(
      new Blob([this.refs], { type: 'text/text' }),
      `${this.utilsService.generateFilename()}.bibtex`,
      { autoBom: true }
    );
  }

  onSubmit() {
    this.setLoading();
    this.extractionStatus = 'searching';

    if (this.fromDate) {
      const [year, month, day] = this.fromDate.split('-');
      this.query.fromYear = year;
      this.query.fromMonth = month;
      this.query.fromDay = day;
    } else {
      this.query.fromYear = '';
      this.query.fromMonth = '';
      this.query.fromDay = '';
    }

    if (this.toDate) {
      const [year, month, day] = this.toDate.split('-');
      this.query.toYear = year;
      this.query.toMonth = month;
      this.query.toDay = day;
    } else {
      this.query.toYear = '';
      this.query.toMonth = '';
      this.query.toDay = '';
    }

    const query = this.utilsService.prepareQuery(this.query);

    this.extractorService.getStatus(query).subscribe({
      next: (status) => {
        if (status.links.length > 0) {
          this.pendingStatus = status;
          this.extractionStatus = 'confirm';
        } else {
          this.extractionStatus = 'empty';
        }
      },
      error: () => (this.extractionStatus = 'error'),
    });
  }

  startExtraction() {
    if (!this.pendingStatus) return;

    this.extractionStatus = 'extracting';
    let count = 1;
    this.extractedCount = 0;
    this.progressText = `Extraindo página 1 de ${this.pendingStatus.links.length}`;
    this.total = this.pendingStatus.total;

    from(this.pendingStatus.links)
      .pipe(
        takeUntil(this.cancelExtraction$),
        concatMap((link) => this.extractorService.extract(link))
      )
      .subscribe({
        next: (result) => {
          this.progressText = `Extraindo página ${++count} de ${this.pendingStatus!.links.length}`;
          this.refs += result.references.join('\r\n');
          this.extractedCount += result.references.length;
          this.percentage = `${(this.extractedCount / this.total) * 100}%`;
        },
        complete: () => {
          this.progressText = 'Concluído!';
          this.pendingStatus = null;
          setTimeout(() => (this.extractionStatus = 'result'), 1500);
        },
        error: () => (this.extractionStatus = 'error'),
      });
  }

  cancelExtraction() {
    this.cancelExtraction$.next();
    this.progressText = 'Cancelado pelo usuário.';
    this.pendingStatus = null;
    this.extractionStatus = 'result'; // Land gracefully to whatever was extracted
  }

  cancelSearch() {
    this.pendingStatus = null;
    this.extractionStatus = 'start';
  }

  setLoading() {
    this.progressText = 'Buscando páginas...';
    this.refs = '';
    this.total = 0;
    this.extractedCount = 0;
    this.percentage = '0%';
  }

  get isLoading() {
    return this.extractionStatus === 'searching' || this.extractionStatus === 'extracting';
  }

  get hasError() {
    return this.extractionStatus === 'error';
  }

  get isEmpty() {
    return this.extractionStatus === 'empty';
  }

  get hasResults() {
    return this.extractionStatus === 'result';
  }
}
