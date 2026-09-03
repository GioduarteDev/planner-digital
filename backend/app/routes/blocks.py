from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Agenda, Page, PageBlock, User
from app.schemas import (
    PageBlockCreate,
    PageBlockReorderRequest,
    PageBlockResponse,
    PageBlockUpdate,
)


router = APIRouter(
    tags=["Page Blocks"],
)


def get_user_page(
    page_id: int,
    current_user: User,
    db: Session,
) -> Page:
    page = db.scalar(
        select(Page)
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            Page.id == page_id,
            Agenda.user_id == current_user.id,
        )
    )

    if page is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Página não encontrada.",
        )

    return page


def get_user_block(
    block_id: int,
    current_user: User,
    db: Session,
) -> PageBlock:
    block = db.scalar(
        select(PageBlock)
        .join(
            Page,
            PageBlock.page_id == Page.id,
        )
        .join(
            Agenda,
            Page.agenda_id == Agenda.id,
        )
        .where(
            PageBlock.id == block_id,
            Agenda.user_id == current_user.id,
        )
    )

    if block is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bloco não encontrado.",
        )

    return block


@router.get(
    "/pages/{page_id}/blocks",
    response_model=list[PageBlockResponse],
)
def list_page_blocks(
    page_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_page(
        page_id,
        current_user,
        db,
    )

    blocks = db.scalars(
        select(PageBlock)
        .where(
            PageBlock.page_id == page_id,
        )
        .order_by(
            PageBlock.position,
            PageBlock.created_at,
            PageBlock.id,
        )
    ).all()

    return blocks


@router.post(
    "/pages/{page_id}/blocks",
    response_model=PageBlockResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_page_block(
    page_id: int,
    data: PageBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_page(
        page_id,
        current_user,
        db,
    )

    last_position = db.scalar(
        select(
            func.max(
                PageBlock.position
            )
        ).where(
            PageBlock.page_id == page_id,
        )
    )

    new_position = (
        last_position + 1
        if last_position is not None
        else 0
    )

    block = PageBlock(
        page_id=page_id,
        block_type=data.block_type,
        data=data.data,
        position=new_position,
    )

    db.add(block)
    db.commit()
    db.refresh(block)

    return block


@router.patch(
    "/blocks/{block_id}",
    response_model=PageBlockResponse,
)
def update_page_block(
    block_id: int,
    data: PageBlockUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    block = get_user_block(
        block_id,
        current_user,
        db,
    )

    updates = data.model_dump(
        exclude_unset=True
    )

    for field, value in updates.items():
        setattr(
            block,
            field,
            value,
        )

    db.commit()
    db.refresh(block)

    return block


@router.delete(
    "/blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_page_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    block = get_user_block(
        block_id,
        current_user,
        db,
    )

    db.delete(block)
    db.commit()


@router.patch(
    "/pages/{page_id}/blocks/reorder",
    response_model=list[PageBlockResponse],
)
def reorder_page_blocks(
    page_id: int,
    data: PageBlockReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    get_user_page(
        page_id,
        current_user,
        db,
    )

    blocks = db.scalars(
        select(PageBlock)
        .where(
            PageBlock.page_id == page_id,
        )
    ).all()

    existing_ids = {
        block.id
        for block in blocks
    }

    received_ids = data.block_ids

    if len(received_ids) != len(
        set(received_ids)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A lista contém IDs "
                "duplicados."
            ),
        )

    if set(received_ids) != existing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A lista precisa conter "
                "todos os blocos da página."
            ),
        )

    blocks_by_id = {
        block.id: block
        for block in blocks
    }

    for position, block_id in enumerate(
        received_ids
    ):
        blocks_by_id[
            block_id
        ].position = position

    db.commit()

    reordered_blocks = [
        blocks_by_id[block_id]
        for block_id in received_ids
    ]

    return reordered_blocks