import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PistaFisicaUnovsunoComponent } from './pista-fisica-unovsuno.component';

describe('PistaFisicaUnovsunoComponent', () => {
  let component: PistaFisicaUnovsunoComponent;
  let fixture: ComponentFixture<PistaFisicaUnovsunoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PistaFisicaUnovsunoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PistaFisicaUnovsunoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
