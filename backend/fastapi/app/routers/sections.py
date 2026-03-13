"""Section CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Section
from app.schemas import SectionCreate, SectionUpdate, SectionResponse

router = APIRouter()


@router.get("/", response_model=list[SectionResponse])
async def list_sections(song_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Section)
    if song_id:
        query = query.filter(Section.song_id == song_id)
    return query.order_by(Section.start_ms).all()


@router.post("/", response_model=SectionResponse, status_code=201)
async def create_section(data: SectionCreate, db: Session = Depends(get_db)):
    section = Section(**data.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.patch("/{section_id}", response_model=SectionResponse)
async def update_section(section_id: str, data: SectionUpdate, db: Session = Depends(get_db)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(section, key, value)

    db.commit()
    db.refresh(section)
    return section


@router.delete("/{section_id}", status_code=204)
async def delete_section(section_id: str, db: Session = Depends(get_db)):
    section = db.query(Section).filter(Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()
