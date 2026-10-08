import pytest
from app.domain.user_logic import calculate_balance, sanitize_username, build_user_record, map_user_to_dto


def test_calculate_balance_pure_function():
    # Prueba de cálculo de saldo con sumas y restas válidas
    assert calculate_balance(1000, 500) == 1500
    assert calculate_balance(1000, -300) == 700
    assert calculate_balance(500, -500) == 0

    # Debe lanzar excepción si el saldo resultante es negativo
    with pytest.raises(ValueError) as exc:
        calculate_balance(500, -600)
    assert "Balance insuficiente" in str(exc.value)


def test_sanitize_username():
    # Prueba de limpieza de espacios en blanco
    assert sanitize_username("   player123   ") == "player123"


def test_build_user_record():
    # Prueba de construcción del registro inmutable de usuario
    record = build_user_record(
        username="  bob_marley  ",
        hashed_password="hashed_pwd_value",
        email="  bob@reggae.com  ",
        initial_chips=5000,
        role="player"
    )
    assert record["username"] == "bob_marley"
    assert record["hashed_password"] == "hashed_pwd_value"
    assert record["email"] == "bob@reggae.com"
    assert record["chips"] == 5000
    assert record["role"] == "player"
    assert "created_at" in record


def test_map_user_to_dto():
    # Prueba de proyección pública sin incluir el hash de contraseña
    doc = {
        "_id": "60c72b2f9b1d8b2bad000001",
        "username": "alice",
        "hashed_password": "supersecretpasswordhash",
        "email": "alice@test.com",
        "chips": 10000,
        "role": "player",
    }
    dto = map_user_to_dto(doc)
    assert "hashed_password" not in dto
    assert dto["id"] == "60c72b2f9b1d8b2bad000001"
    assert dto["username"] == "alice"
    assert dto["chips"] == 10000
