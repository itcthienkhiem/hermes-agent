"""Agnes AI provider profile."""

from providers import register_provider
from providers.base import ProviderProfile

agnes_ai = ProviderProfile(
    name="agnes-ai",
    aliases=("agnes",),
    env_vars=("AGNES_API_KEY",),
    display_name="Agnes AI",
    description="Agnes AI — OpenAI-compatible multimodal API",
    signup_url="https://agnes-ai.com/",
    base_url="https://apihub.agnes-ai.com/v1",
    supports_vision=True,
    default_aux_model="agnes-1.5-flash",
    fallback_models=(
        "agnes-1.5-pro",
        "agnes-1.5-flash",
    ),
)

register_provider(agnes_ai)
