"""Run exploration, chronological training, evaluation, and one model save."""

if __package__:
    from .pipeline import train
else:
    from pipeline import train


if __name__ == "__main__":
    train()
