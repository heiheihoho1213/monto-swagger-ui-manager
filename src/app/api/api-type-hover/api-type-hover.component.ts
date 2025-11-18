import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { CopyService, IdService, TypeMockService } from 'src/app/share/service';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-api-type-hover',
  templateUrl: './api-type-hover.component.html',
  styleUrls: ['./api-type-hover.component.less'],
  providers: [TypeMockService],
})
export class ApiTypeHoverComponent implements OnInit {
  private _code!: string;
  @Input() set code(value: string) {
    if (!this.code && value) {
      this._code = value;
      this.codeString = value;
    } else {
      this.resize = !!value;
    }
  }
  get code(): string {
    return this._code;
  }

  @Output() closeMenu = new EventEmitter<void>();

  typeID!: string;

  removeQuestion = false;

  showSample = false;

  fixed = true;

  noQuestionCode = '';

  mockCode = '';

  codeString = '';

  resize!: boolean;

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.close();
        break;

      default:
        break;
    }
  }

  constructor(
    private idService: IdService,
    private copyService: CopyService,
    private typeMockService: TypeMockService
  ) {
    this.typeID = this.idService.genID();
  }

  ngOnInit(): void { }

  removeCodeQuestion(toggle: MatSlideToggleChange): void {
    if (toggle.checked && !this.noQuestionCode) {
      this.noQuestionCode = this.code.replace(/\?:/gi, ':');
    }

    this.removeQuestion = toggle.checked;
    this.codeString = toggle.checked ? this.noQuestionCode : this.code;
  }

  // 根据声明类型（codeString），生成 mock 数据，（可模拟 mockjs 的生成逻辑）
  getMockCode(toggle: MatSlideToggleChange): void {
    this.showSample = toggle.checked;

    if (!this.mockCode) {
      this.mockCode = this.typeMockService.buildMockCode(this.code);
    }

    if (toggle.checked) {
      this.codeString = this.mockCode;
      return;
    }

    this.codeString = this.removeQuestion ? this.noQuestionCode : this.code;
  }

  copy(): void {
    this.copyService.copy(this.codeString, false);

    if (!this.fixed) {
      this.close();
    }
  }

  close(): void {
    this.closeMenu.emit();
  }

  useFoarmatCode(value: string): void {
    if (value !== this.code) {
      this._code = value;
    }
  }

  fixedPopover(toggle: MatSlideToggleChange): void {
    this.fixed = toggle.checked;
  }
}
