from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from .. import auth, db, schemas

router = APIRouter(tags=["auth"])


@router.post("/signup", response_model=schemas.UserResponse)
async def signup(user: schemas.UserCreate):
    # Check if user exists
    check_query = "SELECT 1 FROM public.users WHERE email = $1"
    pool = await db.get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchval(check_query, user.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password and insert
        hashed_pw = auth.get_password_hash(user.password)
        # Force default role to ADMIN
        insert_query = """
            INSERT INTO public.users (email, hashed_password, full_name, role)
            VALUES ($1, $2, $3, 'user')
            RETURNING id, email, full_name, role
        """
        row = await conn.fetchrow(insert_query, user.email, hashed_pw, user.full_name)

    return dict(row)


@router.post("/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    query = "SELECT * FROM public.users WHERE email = $1"
    pool = await db.get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            query, form_data.username
        )  # username field contains email

    if not user or not auth.verify_password(
        form_data.password, user["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: dict = Depends(auth.get_current_user)):
    email = current_user["email"]
    query = (
        "SELECT id, email, full_name, role, phone FROM public.users WHERE email = $1"
    )
    pool = await db.get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(query, email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user_dict = dict(user)
    # Ensure role is set
    if not user_dict.get("role"):
        user_dict["role"] = "user"

    return user_dict


@router.put("/me", response_model=schemas.UserResponse)
async def update_user_me(
    user_update: schemas.UserUpdate, current_user: dict = Depends(auth.get_current_user)
):
    email = current_user["email"]

    fields = []
    values = []
    idx = 1

    if user_update.full_name is not None:
        fields.append(f"full_name = ${idx}")
        values.append(user_update.full_name)
        idx += 1

    if user_update.phone is not None:
        fields.append(f"phone = ${idx}")
        values.append(user_update.phone)
        idx += 1

    if not fields:
        query = "SELECT id, email, full_name, role, phone FROM public.users WHERE email = $1"
        pool = await db.get_pool()
        async with pool.acquire() as conn:
            user = await conn.fetchrow(query, email)
        return dict(user)

    values.append(email)

    query = f"""
        UPDATE public.users
        SET {", ".join(fields)}
        WHERE email = ${idx}
        RETURNING id, email, full_name, role, phone
    """

    pool = await db.get_pool()
    async with pool.acquire() as conn:
        updated_user = await conn.fetchrow(query, *values)

    return dict(updated_user)
