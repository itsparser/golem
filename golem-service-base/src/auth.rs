use std::fmt::{Display, Formatter};

use golem_common::model::{AccountId, HasAccountId};
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, PartialEq, Eq, Hash)]
pub struct EmptyAuthCtx();

impl Display for EmptyAuthCtx {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "EmptyAuthCtx")
    }
}

impl IntoIterator for EmptyAuthCtx {
    type Item = (String, String);
    type IntoIter = std::iter::Empty<Self::Item>;

    fn into_iter(self) -> Self::IntoIter {
        std::iter::empty()
    }
}

#[derive(
    Default,
    Debug,
    Clone,
    PartialEq,
    Eq,
    Hash,
    bincode::Encode,
    bincode::Decode,
    Serialize,
    Deserialize,
)]
pub struct DefaultNamespace();

impl HasAccountId for DefaultNamespace {
    fn account_id(&self) -> AccountId {
        AccountId::placeholder()
    }
}

impl Display for DefaultNamespace {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "default")
    }
}

impl TryFrom<String> for DefaultNamespace {
    type Error = String;
    fn try_from(value: String) -> Result<Self, Self::Error> {
        if value.as_str() == "default" {
            Ok(DefaultNamespace::default())
        } else {
            Err("Failed to parse empty namespace".to_string())
        }
    }
}
